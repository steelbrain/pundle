/* @flow */

import Path from 'path'
import debounce from 'sb-debounce'
import fileSystem from 'sb-fs'
import difference from 'lodash.difference'
import { MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, FileChunk, FileImport } from 'pundle-api/types'

import Watcher from './watcher'
import * as Helpers from '../context/helpers'
import type Chunk from '../chunk'
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
    entry: FileImport,
    files: Map<string, File>,
    oldFiles: Map<string, File>,
    useCache: boolean,
    forceOverwrite: boolean = false,
    tickCallback: ((oldFile: ?File, file: File) => any)
  ): Promise<boolean> {
    const resolved = await this.context.resolve(entry.request, entry.from, useCache)
    entry.resolved = resolved
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
      this.processFileTree(item, files, oldFiles, useCache, forceOverwrite, tickCallback)
    ))
    await Promise.all(file.chunks.map(item =>
      Promise.all(item.imports.map(importEntry =>
        this.processFileTree(importEntry, files, oldFiles, useCache, forceOverwrite, tickCallback)
      ))
    ))
    await tickCallback(oldFile, file)
    return true
  }
  async build(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<Array<Chunk>> {
    const files: Map<string, File> = new Map()
    let fileChunks: Array<FileChunk> = this.context.config.entry.map(request => ({
      id: this.context.getUIDForChunk(),
      entry: [this.context.getImportRequest(request)],
      imports: [],
    }))

    await Promise.all(fileChunks.map(chunk =>
      Promise.all(chunk.entry.map(chunkEntry =>
        this.processFileTree(chunkEntry, files, oldFiles, useCache, false, function(_: ?File, file: File) {
          if (file.chunks.length) {
            fileChunks = fileChunks.concat(file.chunks)
          }
        })
      ))
    ))
    const chunks = fileChunks.map(chunk => this.context.getChunk(chunk, files))

    for (const entry of Helpers.filterComponents(this.context.components, 'chunk-transformer')) {
      await Helpers.invokeComponent(this.context, entry, 'callback', [], chunks)
    }
    // TODO: Add a way for to replace the javascript in an html file so we can fill the scripts with the chunk paths
    // because we know where they are

    return chunks
  }
  async watch(useCache: boolean, oldFiles: Map<string, File> = new Map()): Promise<void> {
    const files: Map<string, File> = new Map()
    let fileChunks: Array<FileChunk> = this.context.config.entry.map(request => ({
      id: this.context.getUIDForChunk(),
      entry: [this.context.getImportRequest(request)],
      imports: [],
    }))

    await Promise.all(fileChunks.map(chunk =>
      Promise.all(chunk.entry.map(chunkEntry =>
        this.processFileTree(chunkEntry, files, oldFiles, useCache, false, function(_: ?File, file: File) {
          if (file.chunks.length) {
            fileChunks = fileChunks.concat(file.chunks)
          }
          // TODO: Diff the imports and watch/unwatch files
          // TODO: Diff the chunks and add/remove chunks
        })
      ))
    ))
    const chunks = fileChunks.map(chunk => this.context.getChunk(chunk, files))

    for (const entry of Helpers.filterComponents(this.context.components, 'chunk-transformer')) {
      await Helpers.invokeComponent(this.context, entry, 'callback', [], chunks)
    }

    // NOTE: Move all the entries from everyone to the first, this is required because we can only have one entry point in bundles, not several
    chunks.forEach(function(chunk, index) {
      if (index === 0) return
      if (chunk.entry.length) {
        chunks[0].entry = chunks[0].entry.concat(chunk.entry)
        chunk.entry = []
      }
    })

    console.log(chunks)
  }
  dispose() {
    this.context.components.forEach(({ component, config }) => this.context.deleteComponent(component, config))
    this.subscriptions.dispose()
  }
}
