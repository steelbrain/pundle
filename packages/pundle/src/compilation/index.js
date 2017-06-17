/* @flow */

import Path from 'path'
import debounce from 'sb-debounce'
import fileSystem from 'sb-fs'
import differenceBy from 'lodash.differenceby'
import { File, Context, MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { FileChunk, FileImport } from 'pundle-api/types'

import Watcher from './watcher'
import { serializeImport, serializeChunk } from './helpers'

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

    const contents = await fileSystem.readFile(filePath)
    const sourceStat = await fileSystem.stat(filePath)
    const file = new File(filePath, contents, sourceStat.mtime.getTime() / 1000)

    // Transformer
    for (const entry of this.context.getComponents('transformer')) {
      const transformerResult = await this.context.invokeComponent(entry, 'callback', [], [file])
      if (transformerResult) {
        file.mergeTransformation(transformerResult.contents, transformerResult.sourceMap)
      }
    }

    // Loader
    let loaderResult
    for (const entry of this.context.getComponents('loader')) {
      loaderResult = await this.context.invokeComponent(entry, 'callback', [], [file])
      if (loaderResult) {
        file.mergeTransformation(loaderResult.contents, loaderResult.sourceMap)
        file.setChunks(file.getChunks().concat(loaderResult.chunks))
        file.setImports(file.getImports().concat(loaderResult.imports))
        break
      }
    }
    if (!loaderResult) {
      throw new MessageIssue(`No loader configured in Pundle for '${filePath}'. Try adding pundle-loader-js (or another depending on filetype) with appropriate settings to your configuration`, 'error')
    }

    // Plugin
    for (const entry of this.context.getComponents('plugin')) {
      await this.context.invokeComponent(entry, 'callback', [], [file])
    }

    return file
  }
  async processFileTree(
    entry: string | FileImport,
    files: Map<string, File>,
    oldFiles: Map<string, File>,
    useCache: boolean,
    forceOverwrite: boolean = false,
    tickCallback: ((oldFile: ?File, file: File) => any),
  ): Promise<boolean> {
    let resolved
    if (typeof entry === 'string') {
      resolved = entry
    } else {
      try {
        resolved = await this.context.resolve(entry.request, entry.from, useCache)
        entry.resolved = resolved
      } catch (error) {
        throw error
      }
    }
    if (files.has(resolved) && !forceOverwrite) {
      return true
    }

    let newFile
    const currentFile = files.get(resolved)
    if (currentFile === null) {
      // It's locked and therefore in progress
      return true
    }
    if (!currentFile && oldFiles.has(resolved) && useCache) {
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
        newFile = lastStateFile
      }
    }
    try {
      if (!newFile) {
        // $FlowIgnore: It's a temp lock
        files.set(resolved, null)
        newFile = await this.processFile(resolved)
      }
      await Promise.all(newFile.getImports().map(item =>
        this.processFileTree(item, files, oldFiles, useCache, false, tickCallback),
      ))
      await Promise.all(newFile.getChunks().map(item =>
        Promise.all(item.imports.map(importEntry =>
          this.processFileTree(importEntry, files, oldFiles, useCache, false, tickCallback),
        )),
      ))
    } catch (error) {
      if (currentFile) {
        files.set(resolved, currentFile)
      } else {
        files.delete(resolved)
      }
      throw error
    }
    await tickCallback(currentFile, newFile)
    files.set(resolved, newFile)
    return true
  }
  // Helper method to attach files to a chunk from a files pool
  processChunk(chunk: FileChunk, files: Map<string, File>): void {
    chunk.files.clear()
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
      file.getImports().forEach(entry => iterate(entry))
    }

    chunk.entries.forEach(entry => iterate(entry))
    chunk.imports.forEach(entry => iterate(entry))
  }
  async build(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<Array<FileChunk>> {
    const files: Map<string, File> = new Map()
    let chunks = this.context.config.entry.map((request) => {
      const chunk = this.context.getChunk()
      chunk.addEntry(this.context.getImportRequest(request))
      return chunk
    })

    await Promise.all(chunks.map(chunk =>
      Promise.all(chunk.entries.map(chunkEntry =>
        this.processFileTree(chunkEntry, files, oldFiles, useCache, false, function(_: ?File, file: File) {
          const fileChunks = file.getChunks()
          if (fileChunks.length) {
            chunks = chunks.concat(fileChunks)
          }
        }),
      )),
    ))
    chunks.forEach(chunk => this.processChunk(chunk, files))
    for (const entry of this.context.getComponents('chunk-transformer')) {
      await this.context.invokeComponent(entry, 'callback', [], [chunks])
    }

    return chunks
  }
  async watch(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<Disposable> {
    let queue = Promise.resolve()
    const chunks: Array<FileChunk> = this.context.config.entry.map((request) => {
      const chunk = this.context.getChunk()
      chunk.addEntry(this.context.getImportRequest(request))
      return chunk
    })

    const files: Map<string, File> = new Map()
    const watcher = new Watcher({
      usePolling: this.context.config.watcher.usePolling,
    })
    const disposable = new Disposable(() => {
      watcher.dispose()
      this.subscriptions.delete(disposable)
    })
    this.subscriptions.add(disposable)

    const enqueue = callback => (queue = queue.then(callback).catch(e => this.context.report(e)))
    const triggerRecompile = async () => {
      await queue
      const cloned = chunks.slice()
      cloned.forEach(chunk => this.processChunk(chunk, files))
      for (const entry of this.context.getComponents('chunk-transformer')) {
        await this.context.invokeComponent(entry, 'callback', [], [cloned])
      }
      for (const entry of this.context.getComponents('watcher')) {
        try {
          await this.context.invokeComponent(entry, 'compile', [], [cloned, files])
        } catch (error) {
          this.context.report(error)
        }
      }
    }
    const tickCallback = async (oldFile: ?File, file: File) => {
      const oldChunks = oldFile ? oldFile.getChunks() : []
      const newChunks = file.getChunks()
      const addedChunks = differenceBy(newChunks, oldChunks, serializeChunk)
      const removedChunks = differenceBy(oldChunks, newChunks, serializeChunk)
      const unchangedChunks = oldChunks.filter(chunk => removedChunks.indexOf(chunk) !== -1)

      const oldImports = oldFile ? oldFile.getImports : []
      const newImports = file.getImports()
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
        if (entry.resolved) {
          watcher.unwatch(entry.resolved)
        }
      })
      // NOTE: This is required for incremental HMR
      file.getChunks().forEach(function(chunk) {
        const matchingChunk = unchangedChunks.find(entry => serializeChunk(entry) === serializeChunk(chunk))
        if (matchingChunk) {
          chunk.files = matchingChunk.files
          chunk.label = matchingChunk.label
          const index = chunks.indexOf(matchingChunk)
          if (index !== -1) {
            chunks.splice(index, 1)
            chunks.push(chunk)
          }
        }
      })

      for (const entry of this.context.getComponents('watcher')) {
        try {
          await this.context.invokeComponent(entry, 'tick', [], [file])
        } catch (error) {
          this.context.report(error)
        }
      }
    }

    try {
      await Promise.all(chunks.map(chunk =>
        Promise.all(chunk.entries.map(chunkEntry =>
          this.processFileTree(chunkEntry, files, oldFiles, useCache, false, tickCallback),
        )),
      ))
    } catch (error) {
      disposable.dispose()
      throw error
    }

    for (const entry of this.context.getComponents('watcher')) {
      try {
        await this.context.invokeComponent(entry, 'ready', [], [])
      } catch (error) {
        this.context.report(error)
      }
    }
    await triggerRecompile()

    const debounceRecompile = debounce(triggerRecompile, 20)
    watcher.on('change', (filePath) => {
      enqueue(() => this.processFileTree(filePath, files, oldFiles, useCache, true, tickCallback))
      debounceRecompile()
    })
    watcher.on('unlink', (filePath) => {
      enqueue(() => {
        const filesDepending = []
        files.forEach(function(file) {
          if (file.getImports().some(entry => entry.resolved === filePath)) {
            filesDepending.push(file)
          }
        })
        return Promise.all(filesDepending.map(file =>
          this.processFileTree(file.filePath, files, oldFiles, useCache, true, tickCallback),
        ))
      })
      debounceRecompile()
    })

    return disposable
  }
  dispose() {
    this.context.components.forEach(({ component, config }) => this.context.deleteComponent(component, config))
    this.subscriptions.dispose()
  }
}
