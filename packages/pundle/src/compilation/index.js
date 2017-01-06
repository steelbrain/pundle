/* @flow */

import Path from 'path'
import debounce from 'sb-debounce'
import { version as API_VERSION, getRelativeFilePath, MessageIssue } from 'pundle-api'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { File, ComponentAny, Import } from 'pundle-api/types'

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
      if (report && (report.constructor.name === 'MessageIssue' || report.constructor.name === 'FileIssue')) {
        console.log(`${report.severity}: ${report.message}`)
      } else {
        console.log(report)
      }
    }
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    let tried = false
    const knownExtensions = Helpers.getAllKnownExtensions(this.components)
    for (const entry of Helpers.filterComponents(this.components, 'resolver')) {
      const result = await Helpers.invokeComponent(this, entry, 'callback', [{ knownExtensions }], request, from, cached)
      if (result) {
        return result
      }
      tried = true
    }
    if (!tried) {
      throw new MessageIssue('No module resolver configured in Pundle. Try adding pundle-resolver-default to your configuration', 'error')
    }

    const error = new Error(`Cannot find module '${request}'${from ? ` from '${getRelativeFilePath(from, this.config.rootDirectory)}'` : ''}`)
    error.code = 'MODULE_NOT_FOUND'
    throw error
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
  async processTree(request: string, from: ?string, cached: boolean = true, files: Map<string, File>): Promise<Map<string, File>> {
    await Helpers.processFileTree(this, files, request, from, cached)
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
        file.imports = new Set(Array.from(file.imports).concat(Array.from(loaderResult.imports)))
        break
      }
    }
    if (!loaderResult) {
      throw new MessageIssue(`No loader configured in Pundle for '${resolved}'. Try adding pundle-loader-js (or another depending on filetype) with appropriate settings to your configuration`, 'error')
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
  async watch(givenConfig: Object = {}): Promise<Disposable> {
    let queue = Promise.resolve()
    const files: Map<string, File> = new Map()
    const config = Helpers.fillWatcherConfig(givenConfig)
    const resolvedEntries = await Promise.all(this.config.entry.map(entry => this.resolve(entry)))

    const watcher = new Watcher(resolvedEntries, {
      usePolling: config.usePolling,
    })

    const processFile = (filePath, force = true, from = null) =>
      Helpers.processWatcherFileTree(this, config, watcher, files, filePath, force, from)

    const triggerDebouncedCompile = debounce(async () => {
      await queue
      for (const entry of Helpers.filterComponents(this.components, 'watcher')) {
        try {
          await Helpers.invokeComponent(this, entry, 'compile', [], Array.from(files.values()))
        } catch (error) {
          this.report(error)
        }
      }
    }, 10)
    // The 10ms latency is for batch change operations to be compiled at once
    // For example, git checkout another-branch changes a lot of files at once`

    const promises = resolvedEntries.map(entry => processFile(entry))
    const successful = (await Promise.all(promises)).every(i => i)

    for (const entry of Helpers.filterComponents(this.components, 'watcher')) {
      try {
        await Helpers.invokeComponent(this, entry, 'ready', [], Array.from(files.values()))
      } catch (error) {
        this.report(error)
      }
    }
    if (successful) {
      await triggerDebouncedCompile()
    }

    watcher.on('change', (filePath) => {
      queue = queue.then(() => processFile(filePath))
      triggerDebouncedCompile()
    })
    watcher.on('unlink', (filePath) => {
      queue = queue.then(() => files.delete(filePath))
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
