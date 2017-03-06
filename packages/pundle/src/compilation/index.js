/* @flow */

import Path from 'path'
import fileSystem from 'sb-fs'
import differenceBy from 'lodash.differenceby'
import { MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, FileChunk, FileImport } from 'pundle-api/types'

import Watcher from './watcher'
import * as Helpers from '../context/helpers'
import { serializeImport, serializeChunk } from './helpers'
import type Context from '../context'

export default class Compilation {
  context: Context;
  subscriptions: CompositeDisposable;

  constructor(context: Context) {
    this.context = context
    this.subscriptions = new CompositeDisposable()
  }
  // Order of execution:
  // - Transformer (all)
  // - Loader (some)
  // - Plugin (all)
  // Notes:
  // - Do NOT double-resolve if already an absolute path
  // - We are executing Transformers before Loaders because imagine ES6 modules
  //   being transpiled with babel BEFORE giving to loader-js. If they are not
  //   transpiled before hand, they'll give a syntax error in loader
  // - We are not deduping imports because regardless of request, each import
  //   has a unique ID and we have to add mapping for that. So we need them all
  async processFile(filePath: string): Promise<File> {
    if (!Path.isAbsolute(filePath)) {
      throw new Error('compilation.processFile() expects path to be an absolute path')
    }

    const source = await fileSystem.readFile(filePath)
    const sourceStat = await fileSystem.stat(filePath)
    const file = {
      source,
      chunks: [],
      imports: [],
      filePath,
      contents: source,
      sourceMap: null,
      lastModified: sourceStat.mtime.getTime() / 1000,
    }

    // Transformer
    for (const entry of Helpers.filterComponents(this.context.components, 'transformer')) {
      const transformerResult = await Helpers.invokeComponent(this.context, entry, 'callback', [], file)
      Helpers.mergeResult(file, transformerResult)
    }

    // Loader
    let loaderResult
    for (const entry of Helpers.filterComponents(this.context.components, 'loader')) {
      loaderResult = await Helpers.invokeComponent(this.context, entry, 'callback', [], file)
      if (loaderResult) {
        Helpers.mergeResult(file, loaderResult)
        file.chunks = file.chunks.concat(loaderResult.chunks)
        file.imports = file.imports.concat(loaderResult.imports)
        break
      }
    }
    if (!loaderResult) {
      throw new MessageIssue(`No loader configured in Pundle for '${filePath}'. Try adding pundle-loader-js (or another depending on filetype) with appropriate settings to your configuration`, 'error')
    }

    // Plugin
    for (const entry of Helpers.filterComponents(this.context.components, 'plugin')) {
      await Helpers.invokeComponent(this.context, entry, 'callback', [], file)
    }

    return file
  }
  async processFileTree(
    entry: string | FileImport,
    files: Map<string, File>,
    oldFiles: Map<string, File>,
    useCache: boolean,
    forceOverwrite: boolean = false,
    tickCallback: ((oldFile: ?File, file: File) => any)
  ): Promise<boolean> {
    let resolved
    if (typeof entry === 'string') {
      resolved = entry
    } else {
      resolved = await this.context.resolve(entry.request, entry.from, useCache)
      entry.resolved = resolved
    }
    if (files.has(resolved) && !forceOverwrite) {
      return true
    }

    let file
    const oldFile = files.get(resolved)
    if (oldFile === null) {
      // It's locked and therefore in progress
      return true
    }
    if (!oldFile && oldFiles.has(resolved) && useCache) {
      // $FlowIgnore: It's a temp lock
      files.set(resolved, null)
      // ^ Lock the cache early to avoid double-processing because we await below
      let fileStat
      try {
        fileStat = await fileSystem.stat(resolved)
      } catch (_) {
        // The file could no longer exist since the cache was built
      }
      const lastStateFile = oldFiles.get(resolved)
      if (lastStateFile && fileStat && (fileStat.mtime.getTime() / 1000) === lastStateFile.lastModified) {
        file = lastStateFile
      }
    }
    if (!file) {
      // $FlowIgnore: It's a temp lock
      files.set(resolved, null)
      file = await this.processFile(resolved)
    }
    files.set(resolved, file)
    await Promise.all(file.imports.map(item =>
      this.processFileTree(item, files, oldFiles, useCache, false, tickCallback)
    ))
    await Promise.all(file.chunks.map(item =>
      Promise.all(item.imports.map(importEntry =>
        this.processFileTree(importEntry, files, oldFiles, useCache, false, tickCallback)
      ))
    ))
    await tickCallback(oldFile, file)
    return true
  }
  // Helper method to attach files to a chunk from a files pool
  processChunk(chunk: FileChunk, files: Map<string, File>): void {
    function iterate(fileImport: FileImport) {
      const filePath = fileImport.resolved
      if (!filePath) {
        throw new Error(`${fileImport.request} was not resolved from ${fileImport.from || 'Project root'}`)
      }
      if (chunk.files.has(filePath)) {
        return
      }
      const file = files.get(filePath)
      if (!file) {
        throw new Error(`${filePath} was not processed`)
      }
      chunk.files.set(filePath, file)
      file.imports.forEach(entry => iterate(entry))
    }

    chunk.entries.forEach(entry => iterate(entry))
    chunk.imports.forEach(entry => iterate(entry))
  }
  async build(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<Array<FileChunk>> {
    const files: Map<string, File> = new Map()
    let chunks = this.context.config.entry.map(request => this.context.getChunk([this.context.getImportRequest(request)]))

    await Promise.all(chunks.map(chunk =>
      Promise.all(chunk.entries.map(chunkEntry =>
        this.processFileTree(chunkEntry, files, oldFiles, useCache, false, function(_: ?File, file: File) {
          if (file.chunks.length) {
            chunks = chunks.concat(file.chunks)
          }
        })
      ))
    ))
    chunks.forEach(chunk => this.processChunk(chunk, files))
    for (const entry of Helpers.filterComponents(this.context.components, 'chunk-transformer')) {
      await Helpers.invokeComponent(this.context, entry, 'callback', [], chunks)
    }

    // TODO: Add a way for to replace the javascript in an html file so we can fill the scripts with the chunk paths
    // because we know where they are

    return chunks
  }
  async watch(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<void> {
    let queue = Promise.resolve()
    let chunks: Array<FileChunk> = this.context.config.entry.map(request => this.context.getChunk([this.context.getImportRequest(request)]))

    const files: Map<string, File> = new Map()
    const watcher = new Watcher({
      usePolling: this.context.config.watcher.usePolling,
    })

    const enqueue = callback => (queue = queue.then(callback).catch(e => this.context.report(e)))
    const getProcessedChunks = async (): Promise<Array<FileChunk>> => {
      const cloned = chunks.slice()
      cloned.forEach(chunk => this.processChunk(chunk, files))
      for (const entry of Helpers.filterComponents(this.context.components, 'chunk-transformer')) {
        await Helpers.invokeComponent(this.context, entry, 'callback', [], cloned)
      }
      return cloned
    }
    const tickCallback = async (oldFile: ?File, file: File) => {
      if (file.chunks.length) {
        chunks = chunks.concat(file.chunks)
      }
      const oldChunks = oldFile ? oldFile.chunks : []
      const newChunks = file.chunks
      const addedChunks = differenceBy(newChunks, oldChunks, serializeChunk)
      const removedChunks = differenceBy(oldChunks, newChunks, serializeChunk)

      const oldImports = oldFile ? oldFile.imports : []
      const newImports = file.imports
      const addedImports = differenceBy(newImports, oldImports, serializeImport)
      const removedImports = differenceBy(oldImports, newImports, serializeImport)

      if (!oldFile && file) {
        // First compile of this file
        watcher.watch(file.filePath)
      }

      removedChunks.forEach(function(entry) {
        const index = chunks.indexOf(entry)
        if (index !== -1) {
          chunks.splice(index, 1)
        }
      })
      addedChunks.forEach(function(entry) {
        chunks.push(entry)
      })
      addedImports.forEach(function(entry) {
        watcher.watch(entry.resolved)
      })
      removedImports.forEach(function(entry) {
        watcher.unwatch(entry.resolved)
      })

      for (const entry of Helpers.filterComponents(this.context.components, 'watcher')) {
        try {
          await Helpers.invokeComponent(this.context, entry, 'tick', [], file)
        } catch (error) {
          this.context.report(error)
        }
      }
    }

    await Promise.all(chunks.map(chunk =>
      Promise.all(chunk.entries.map(chunkEntry =>
        this.processFileTree(chunkEntry, files, oldFiles, useCache, false, tickCallback)
      ))
    ))

    const processedChunksInitial = await getProcessedChunks()
    for (const entry of Helpers.filterComponents(this.context.components, 'watcher')) {
      try {
        await Helpers.invokeComponent(this, entry, 'ready', [], processedChunksInitial, files)
      } catch (error) {
        this.context.report(error)
      }
    }

    watcher.on('change', (filePath) => {
      enqueue(() => this.processFileTree(filePath, files, oldFiles, useCache, true, tickCallback).then(() => {
        console.log('should recompile now')
      }))
    })
  }
  dispose() {
    this.context.components.forEach(({ component, config }) => this.context.deleteComponent(component, config))
    this.subscriptions.dispose()
  }
}
