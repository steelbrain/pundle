/* @flow */

import Path from 'path'
import debounce from 'sb-debounce'
import fileSystem from 'pundle-fs'
import difference from 'lodash.difference'
import reporterCLI from 'pundle-reporter-cli'
import { version as API_VERSION, getRelativeFilePath, MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, ComponentAny, Import, Resolved } from 'pundle-api/types'

import Watcher from './watcher'
import * as Helpers from './helpers'
import type { ComponentEntry } from './types'
import type { CompilationConfig } from '../../types'

let uniqueID = 0

export default class Compilation {
  config: CompilationConfig;
  components: Set<ComponentEntry>;
  subscriptions: CompositeDisposable;

  constructor(config: CompilationConfig) {
    this.config = config
    this.components = new Set()
    this.subscriptions = new CompositeDisposable()
  }
  async report(report: Object): Promise<void> {
    let tried = false
    for (const entry of Helpers.filterComponents(this.components, 'reporter')) {
      await Helpers.invokeComponent(this, entry, 'callback', [], report)
      tried = true
    }
    if (!tried) {
      reporterCLI.callback(reporterCLI.defaultConfig, report)
    }
  }
  async resolveAdvanced(request: string, from: ?string = null, cached: boolean = true): Promise<Resolved> {
    const knownExtensions = Helpers.getAllKnownExtensions(this.components)
    const filteredComponents = Helpers.filterComponents(this.components, 'resolver')
    if (!filteredComponents.length) {
      throw new MessageIssue('No module resolver configured in Pundle. Try adding pundle-resolver-default to your configuration', 'error')
    }
    for (const entry of filteredComponents) {
      const result = await Helpers.invokeComponent(this, entry, 'callback', [{ knownExtensions }], request, from, cached)
      if (result && result.filePath) {
        return result
      }
    }
    const error = new Error(`Cannot find module '${request}'${from ? ` from '${getRelativeFilePath(from, this.config.rootDirectory)}'` : ''}`)
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    return (await this.resolveAdvanced(request, from, cached)).filePath
  }
  async generate(files: Array<File>, generateConfig: Object = {}): Promise<Object> {
    let result
    for (const entry of Helpers.filterComponents(this.components, 'generator')) {
      result = await Helpers.invokeComponent(this, entry, 'callback', [generateConfig], files)
      if (result) {
        break
      }
    }
    if (!result) {
      throw new MessageIssue('No generator returned generated contents. Try adding pundle-generator-default to your configuration', 'error')
    }
    // Post-Transformer
    for (const entry of Helpers.filterComponents(this.components, 'post-transformer')) {
      const postTransformerResults = await Helpers.invokeComponent(this, entry, 'callback', [], result.contents)
      Helpers.mergeResult(result, postTransformerResults)
    }
    return result
  }
  // Notes:
  // Lock as early as resolved to avoid duplicates
  // Make sure to clear the null lock in case of any error
  // Recurse asyncly until all resolves are taken care of
  // Set resolved paths on all file#imports
  async processTree(request: string, from: ?string = null, cached: boolean = true, files: Map<string, File>): Promise<Map<string, File>> {
    const processFileTree = async (entry: Import) => {
      const resolved = await this.resolve(entry.request, entry.from, cached)
      if (files.has(resolved)) {
        entry.resolved = resolved
        return
      }
      let file
      // $FlowIgnore: Temp
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
    for (const entry of Helpers.filterComponents(this.components, 'transformer')) {
      const transformerResult = await Helpers.invokeComponent(this, entry, 'callback', [], file)
      Helpers.mergeResult(file, transformerResult)
    }

    // Loader
    let loaderResult
    for (const entry of Helpers.filterComponents(this.components, 'loader')) {
      loaderResult = await Helpers.invokeComponent(this, entry, 'callback', [], file)
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
    for (const entry of Helpers.filterComponents(this.components, 'plugin')) {
      await Helpers.invokeComponent(this, entry, 'callback', [], file)
    }

    return file
  }
  getImportRequest(request: string, from: string): Import {
    const id = ++uniqueID
    return { id, request, resolved: null, from }
  }
  setUniqueID(newUniqueID: number): void {
    uniqueID = newUniqueID
  }
  getUniqueID(): number {
    return uniqueID
  }
  addComponent(component: ComponentAny, config: Object): void {
    if (!component || component.$apiVersion !== API_VERSION) {
      throw new Error('API version of component mismatches')
    }
    this.components.add({ component, config })
    Helpers.invokeComponent(this, { component, config }, 'activate', [])
    return new Disposable(() => {
      this.deleteComponent(component, config)
    })
  }
  deleteComponent(component: ComponentAny, config: Object): boolean {
    for (const entry of this.components) {
      if (entry.config === config && entry.component === component) {
        this.components.delete(entry)
        Helpers.invokeComponent(this, entry, 'dispose', [])
        return true
      }
    }
    return false
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
  async watch(givenConfig: Object = {}): Promise<Disposable> {
    let queue = Promise.resolve()
    const files: Map<string, File> = new Map()
    const config = Helpers.fillWatcherConfig(givenConfig)
    const resolvedEntries = await Promise.all(this.config.entry.map(entry => this.resolve(entry)))

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
      let file = null
      let processError = null
      try {
        // $FlowIgnore: Temporarily allow null
        files.set(filePath, null)
        file = await this.processFile(filePath)
        files.set(filePath, file)
        await Promise.all(file.imports.map(entry => this.resolve(entry.request, filePath).then(resolved => {
          entry.resolved = resolved
        })))
      } catch (error) {
        if (oldValue) {
          files.set(filePath, oldValue)
        } else {
          files.delete(filePath)
        }
        processError = error
        this.report(error)
        return false
      } finally {
        for (const entry of Helpers.filterComponents(this.components, 'watcher')) {
          try {
            await Helpers.invokeComponent(this, entry, 'tick', [], filePath, processError, file)
          } catch (error) {
            this.report(error)
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
        this.report(compilationError)
        return false
      }
    }

    let compiling = false
    let recompile: boolean = false
    const triggerCompile = async () => {
      compiling = true
      await queue
      for (const entry of Helpers.filterComponents(this.components, 'watcher')) {
        try {
          await Helpers.invokeComponent(this, entry, 'compile', [], Array.from(files.values()))
        } catch (error) {
          this.report(error)
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
        for (let i = 0, length = file.imports.length; i < length; i++) {
          const entry = file.imports[i]
          const oldResolved = entry.resolved
          try {
            await fileSystem.stat(oldResolved)
            continue
          } catch (_) { /* No Op */ }
          watcher.unwatch(oldResolved)
          try {
            const resolved = await this.resolve(entry.request, file.filePath)
            entry.resolved = resolved
            watcher.enable(resolved)
            watcher.watch(resolved)
            queue = queue.then(() => processFile(resolved, false))
          } catch (_) {
            watcher.watch(oldResolved)
            this.report(_)
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
    for (const entry of Helpers.filterComponents(this.components, 'watcher')) {
      try {
        await Helpers.invokeComponent(this, entry, 'ready', [], successful, Array.from(files.values()))
      } catch (error) {
        this.report(error)
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
    this.subscriptions.add(disposable)
    return disposable
  }
  dispose() {
    this.components.forEach(({ component, config }) => this.deleteComponent(component, config))
    this.subscriptions.dispose()
  }
}
