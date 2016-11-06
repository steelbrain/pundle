/* @flow */

import Path from 'path'
import unique from 'lodash.uniqby'
import chokidar from 'chokidar'
import difference from 'lodash.difference'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, ComponentAny, Import } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { ComponentEntry } from './types'
import type { Config } from '../types'

let uniqueID = 0

export default class Compilation {
  config: Config;
  components: Set<ComponentEntry>;
  subscriptions: CompositeDisposable;

  constructor(config: Config) {
    this.config = config
    this.components = new Set()
    this.subscriptions = new CompositeDisposable()
  }
  report(...parameters: Array<any>): void {
    console.log(...parameters)
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    for (const component of Helpers.filterComponents(this.components, 'resolver')) {
      const result = await Helpers.invokeComponent(this, component, request, from, cached)
      if (result) {
        return result
      }
    }

    const error = new Error(`Cannot find module '${request}'${from ? ` from '${from}'` : ''}`)
    // $FlowIgnore: This is a custom property
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  async generate(files: Array<File>, runtimeConfig: Object = {}): Promise<Object> {
    let result
    for (const component of Helpers.filterComponents(this.components, 'generator')) {
      result = await Helpers.invokeComponent(this, component, files, runtimeConfig)
      if (result) {
        break
      }
    }
    if (!result) {
      throw new Error('No suitable generator found')
    }
    // Post-Transformer
    for (const component of Helpers.filterComponents(this.components, 'post-transformer')) {
      const postTransformerResults = await Helpers.invokeComponent(this, component, result.contents)
      Helpers.mergeResult(result, postTransformerResults)
    }
    return result
  }
  // Notes:
  // Lock as early as resolved to avoid duplicates
  // Recurse asyncly until all resolves are taken care of
  // Set resolved paths on all file#imports
  async processTree(givenRequest: string, givenFrom: ?string, cached: boolean = true, files: Map<string, File>): Promise<Map<string, File>> {
    const processFile = async (path, from = null) => {
      const resolved = await this.resolve(path, from, cached)
      if (files.has(resolved)) {
        return resolved
      }
      // $FlowIgnore: We are using an invalid-ish flow type on purpose, 'cause flow is dumb and doesn't understand that we *fix* these nulls two lines below
      files.set(resolved, null)
      const file = await this.processFile(resolved, from, cached)
      files.set(resolved, file)
      await Promise.all(Array.from(file.imports).map(entry =>
        processFile(entry.request, resolved).then(function(resolvedImport) {
          entry.resolved = resolvedImport
        })
      ))
      return resolved
    }

    await processFile(givenRequest, givenFrom)
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
  async processFile(request: string, from: ?string, cached: boolean = true): Promise<File> {
    let resolved = request
    if (!Path.isAbsolute(resolved)) {
      resolved = await this.resolve(request, from, cached)
    }

    const source = await this.config.fileSystem.readFile(resolved)
    const file = {
      source,
      imports: new Set(),
      filePath: resolved,
      contents: source,
      sourceMap: null,
    }

    // Transformer
    for (const component of Helpers.filterComponents(this.components, 'transformer')) {
      const transformerResult = await Helpers.invokeComponent(this, component, Object.assign({}, file))
      Helpers.mergeResult(file, transformerResult)
    }

    // Loader
    for (const component of Helpers.filterComponents(this.components, 'loader')) {
      const loaderResult = await Helpers.invokeComponent(this, component, Object.assign({}, file))
      if (!loaderResult) {
        continue
      }

      Helpers.mergeResult(file, loaderResult)
      const mergedImports = Array.from(file.imports).concat(Array.from(loaderResult.imports))
      const mergedUniqueImports = unique(mergedImports, 'request')
      file.imports = new Set(mergedUniqueImports)
      break
    }

    // Plugin
    for (const component of Helpers.filterComponents(this.components, 'plugin')) {
      await Helpers.invokeComponent(this, component, Object.assign({}, file))
    }

    return file
  }
  getImportRequest(request: string, from: string): Import {
    const id = ++uniqueID
    return { id, request, resolved: null, from }
  }
  addComponent(component: ComponentAny, config: Object): void {
    const entry = { component, config }
    this.components.add(entry)
    entry.component.activate.call(this)
    return new Disposable(() => {
      this.deleteComponent(component, config)
    })
  }
  deleteComponent(component: ComponentAny, config: Object): void {
    for (const entry of this.components) {
      if (entry.config === config && entry.component === component) {
        entry.component.dispose.call(this)
        this.components.delete(entry)
        break
      }
    }
  }
  async watch(givenConfig: Object = {}): Promise<Disposable> {
    let queue = Promise.resolve()
    const files: Map<string, File> = new Map()
    const config = Helpers.fillWatcherConfig(givenConfig)
    const resolvedEntries = await Promise.all(this.config.entry.map(entry => this.resolve(entry)))

    const watcher = chokidar.watch(resolvedEntries, {
      usePolling: config.usePolling,
    })
    const processFile = async (filePath, force = true, from = null) => {
      if (files.has(filePath) && !force) {
        return true
      }
      const oldValue = files.get(filePath)
      if (oldValue === null) {
        // We are returning even when forced in case of null value, 'cause it
        // means it is already in progress
        return true
      }
      // Reset contents on both being unable to resolve and error in processing
      let file
      try {
        // $FlowIgnore: Allow null
        files.set(filePath, null)
        file = await this.processFile(filePath, from)
        files.set(filePath, file)
        await Promise.all(Array.from(file.imports).map(entry => this.resolve(entry.request, filePath).then(resolved => {
          entry.resolved = resolved
        })))
        try {
          config.tick(filePath, null)
        } catch (tickError) {
          this.report(tickError)
        }
      } catch (error) {
        // $FlowIgnore: Allow null
        files.set(filePath, oldValue)
        this.report(error)
        try {
          config.tick(filePath, error)
        } catch (tickError) {
          this.report(tickError)
        }
        return false
      }

      const oldImports = oldValue ? Array.from(oldValue.imports).map(e => e.resolved || '') : []
      const newImports = Array.from(file.imports).map(e => e.resolved || '')
      const addedImports = difference(newImports, oldImports)
      const removedImports = difference(oldImports, newImports)
      addedImports.forEach(function(entry) {
        watcher.add(entry)
      })
      removedImports.forEach(function(entry) {
        watcher.unwatch(entry)
      })
      try {
        config.update(filePath, newImports, oldImports)
      } catch (updateError) {
        this.report(updateError)
      }

      try {
        const promises = await Promise.all(Array.from(file.imports).map((entry: Object) =>
          processFile(entry.resolved, false, filePath)
        ))
        return promises.every(i => i)
      } catch (error) {
        this.report(error)
        return false
      }
    }

    const promises = resolvedEntries.map(entry => processFile(entry))
    const successful = (await Promise.all(promises)).every(i => i)
    try {
      config.ready(successful, Array.from(files.values()))
    } catch (readyError) {
      this.report(readyError)
    }
    if (successful) {
      try {
        config.compile(Array.from(files.values()))
      } catch (compileError) {
        this.report(compileError)
      }
    }

    watcher.on('change', (filePath) => {
      queue = queue.then(function() {
        return processFile(filePath)
      }).then((status) => {
        if (!status) {
          return
        }
        try {
          config.compile(Array.from(files.values()))
        } catch (compileError) {
          this.report(compileError)
        }
      })
    })
    watcher.on('unlink', (filePath) => {
      queue = queue.then(function() {
        files.delete(filePath)
      })
    })

    const disposable = new Disposable(() => {
      this.subscriptions.delete(disposable)
      watcher.close()
    })
    this.subscriptions.add(disposable)
    return disposable
  }
  dispose() {
    for (const entry of this.components) {
      entry.component.dispose.call(this)
    }
    this.components.clear()
    this.subscriptions.dispose()
  }
}
