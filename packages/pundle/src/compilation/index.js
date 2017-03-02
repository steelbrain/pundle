/* @flow */

import Path from 'path'
import debounce from 'sb-debounce'
import fileSystem from 'sb-fs'
import difference from 'lodash.difference'
import { MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, Import } from 'pundle-api/types'

import Watcher from './watcher'
import { fillWatcherConfig } from './helpers'
import * as Helpers from '../context/helpers'
import type Context from '../context'

export default class Compilation {
  context: Context;
  subscriptions: CompositeDisposable;

  constructor(context: Context) {
    this.context = context
    this.subscriptions = new CompositeDisposable()
  }
  // Notes:
  // Lock as early as resolved to avoid duplicates
  // Make sure to clear the null lock in case of any error
  // Recurse asyncly until all resolves are taken care of
  // Set resolved paths on all file#imports
  async processTree(request: string, from: ?string = null, cached: boolean = true, files: Map<string, ?File>): Promise<Map<string, ?File>> {
    const processFileTree = async (entry: Import) => {
      const resolved = await this.context.resolve(entry.request, entry.from, cached)
      if (files.has(resolved)) {
        entry.resolved = resolved
        return
      }
      let file
      files.set(resolved, null)
      try {
        file = await this.processFile(resolved)
      } catch (error) {
        files.delete(resolved)
        throw error
      }
      files.set(resolved, file)
      await Promise.all(file.imports.map(item => processFileTree(item, resolved)))
      entry.resolved = resolved
    }
    await processFileTree({ id: 0, request, resolved: null, from })
    return files
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
  async processFile(filePath: string): Promise<File> {
    if (!Path.isAbsolute(filePath)) {
      throw new Error('compilation.processFile() expects path to be an absolute path')
    }

    const source = await fileSystem.readFile(filePath)
    const sourceStat = await fileSystem.stat(filePath)
    const file = {
      source,
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
  // Spec:
  // - Create promised queue
  // - Create files map
  // - Normalize watcher config
  // - Resolve all given entries
  // - Watch the resolved entries
  // - Process trees of all resolved entries
  // - Trigger config.ready regardless of initial success status
  // - Trigger config.compile if initially successful
  // - On each observed file change, try to re-build it's tree and trigger
  //   cofig.compile() if tree rebuilding is successful (in queue)
  // - On each observed unlink, make sure to delete the file (in queue)
  // - Return a disposable, that's also attached to this Compilation instance
  //   and closes the file watcher
  // NOTE: Return value of this function has a special "queue" property
  // NOTE: 10ms latency for batch operations to be compiled at once, imagine changing git branch
  async watch(givenConfig: Object = {}, lastState: Map<string, File> = new Map()): Promise<Disposable & { files: Map<string, File>, queue: Promise<void> }> {
    let queue = Promise.resolve()
    const files: Map<string, ?File> = new Map()
    const config = fillWatcherConfig(givenConfig)
    const resolvedEntries = await Promise.all(this.context.config.entry.map(entry => this.context.resolve(entry)))

    const watcher = new Watcher(resolvedEntries, {
      usePolling: config.usePolling,
    })

    const processFile = async (filePath, overwrite = true) => {
      if (files.has(filePath) && !overwrite) {
        return true
      }
      const oldValue = files.get(filePath)
      if (oldValue === null) {
        // We are returning even when forced in case of null value, 'cause it
        // means it is already in progress
        return true
      }

      // Reset contents on both being unable to resolve and error in processing
      let file: any = null
      let processError = null

      if (typeof oldValue === 'undefined' && lastState.has(filePath)) {
        files.set(filePath, null)
        // ^ Lock the cache early to avoid double-processing because we await below
        let fileStat
        try {
          fileStat = await fileSystem.stat(filePath)
        } catch (_) {
          // The file could no longer exist since the cache was built
        }
        const lastStateFile = lastState.get(filePath)
        if (lastStateFile && fileStat && (fileStat.mtime.getTime() / 1000) === lastStateFile.lastModified) {
          file = lastStateFile
        }
      }

      try {
        if (!file) {
          files.set(filePath, null)
          file = await this.processFile(filePath)
        }
        files.set(filePath, file)
        await Promise.all(file.imports.map(entry => this.context.resolve(entry.request, filePath).then(resolved => {
          entry.resolved = resolved
        })))
      } catch (error) {
        if (oldValue) {
          files.set(filePath, oldValue)
        } else {
          files.delete(filePath)
        }
        processError = error
        this.context.report(error)
        return false
      } finally {
        for (const entry of Helpers.filterComponents(this.context.components, 'watcher')) {
          try {
            await Helpers.invokeComponent(this.context, entry, 'tick', [], filePath, processError, file)
          } catch (error) {
            this.context.report(error)
          }
        }
      }

      const oldImports = oldValue ? oldValue.imports : []
      const newImports = file.imports
      const addedImports = difference(newImports, oldImports)
      const removedImports = difference(oldImports, newImports)
      addedImports.forEach(function(entry) {
        watcher.watch(entry.resolved)
      })
      removedImports.forEach(function(entry) {
        watcher.unwatch(entry.resolved)
      })
      for (let i = 0, length = newImports.length; i < length; i++) {
        watcher.enable(newImports[i].resolved || '')
      }

      try {
        const promises = await Promise.all(file.imports.map((entry: Object) => processFile(entry.resolved, false)))
        return promises.every(i => i)
      } catch (compilationError) {
        this.context.report(compilationError)
        return false
      }
    }

    let compiling = false
    let recompile: boolean = false
    const triggerCompile = async () => {
      compiling = true
      await queue
      for (const entry of Helpers.filterComponents(this.context.components, 'watcher')) {
        try {
          await Helpers.invokeComponent(this.context, entry, 'compile', [], Array.from(files.values()))
        } catch (error) {
          this.context.report(error)
        }
      }
      compiling = false
      if (recompile) {
        recompile = false
        triggerCompile()
      }
    }
    const triggerDebouncedCompile = debounce(function() {
      if (compiling) {
        recompile = true
      } else {
        triggerCompile()
      }
    }, 10)
    const triggerDebouncedImportsCheck = debounce(async () => {
      await queue
      let changed = false
      for (const file of files.values()) {
        if (!file) continue
        for (let i = 0, length = file.imports.length; i < length; i++) {
          const entry = file.imports[i]
          const oldResolved = entry.resolved
          try {
            await fileSystem.stat(oldResolved)
            continue
          } catch (_) { /* No Op */ }
          watcher.unwatch(oldResolved)
          try {
            const resolved = await this.context.resolve(entry.request, file.filePath)
            entry.resolved = resolved
            watcher.enable(resolved)
            watcher.watch(resolved)
            queue = queue.then(() => processFile(resolved, false))
          } catch (_) {
            watcher.watch(oldResolved)
            this.context.report(_)
            break
          }
          // If processing file failed
          if (!await queue) {
            break
          }
          changed = true
        }
      }
      if (changed) {
        triggerDebouncedCompile()
      }
    }, 100)

    const promises = resolvedEntries.map(entry => processFile(entry))
    const successful = (await Promise.all(promises)).every(i => i)

    if (successful) {
      await triggerCompile()
    }
    for (const entry of Helpers.filterComponents(this.context.components, 'watcher')) {
      try {
        await Helpers.invokeComponent(this.context, entry, 'ready', [], successful, Array.from(files.values()))
      } catch (error) {
        this.context.report(error)
      }
    }

    watcher.on('change', (filePath) => {
      // NOTE: Only trigger imports check if processFile() succeeds
      queue = queue
        .then(() => processFile(filePath, true)
        .then((status) => status && triggerDebouncedCompile()))
    })
    watcher.on('unlink', (filePath) => {
      files.delete(filePath)
      watcher.disable(filePath)
      triggerDebouncedImportsCheck()
    })

    const disposable = new Disposable(() => {
      this.subscriptions.delete(disposable)
      watcher.dispose()
    })
    disposable.queue = queue
    disposable.files = files
    this.subscriptions.add(disposable)
    return disposable
  }
  dispose() {
    this.context.components.forEach(({ component, config }) => this.context.deleteComponent(component, config))
    this.subscriptions.dispose()
  }
}
