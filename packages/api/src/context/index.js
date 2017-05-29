/* @flow */

import invariant from 'assert'
import { Disposable } from 'sb-event-kit'
import { version as API_VERSION } from '../helpers'
import { MessageIssue } from '../issues'

import File from '../file'
import * as Helpers from './helpers'
import type {
  FileChunk,
  FileImport,
  PundleConfig,
  ComponentAny,
  ResolverResult,
  GeneratorResult,
  ComponentConfigured,
} from '../../types'

class Context {
  uid: Map<string, number>;
  config: PundleConfig;
  components: Set<ComponentConfigured>;

  constructor(config: PundleConfig) {
    this.uid = new Map()
    this.config = config
    this.components = new Set()
  }
  async report(report: Object): Promise<void> {
    let tried = false
    for (const entry of this.getComponents('reporter')) {
      await this.invokeComponent(entry, 'callback', [], [report])
      tried = true
    }
    if (!tried) {
      console.error(report)
    }
  }
  async resolveAdvanced(request: string, from: ?string = null, cached: boolean = true): Promise<ResolverResult> {
    const knownExtensions = Helpers.getAllKnownExtensions(this.components)
    const filteredComponents = this.getComponents('resolver')
    if (!filteredComponents.length) {
      throw new MessageIssue('No module resolver configured in Pundle. Try adding pundle-resolver-default to your configuration', 'error')
    }
    for (const entry of filteredComponents) {
      const result = await this.invokeComponent(entry, 'callback', [{ knownExtensions }], [request, from, cached])
      if (result && result.filePath) {
        return result
      }
    }
    throw new Error('Module not found')
    // TODO: Uncomment this
    // const error = new Error(`Cannot find module '${request}'${from ? ` from '${getRelativeFilePath(from, this.config.rootDirectory)}'` : ''}`)
    // error.code = 'MODULE_NOT_FOUND'
    // throw error
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    const resolved = await this.resolveAdvanced(request, from, cached)
    return resolved.filePath
  }
  async generate(given: Array<FileChunk>, generateConfig: Object = {}): Promise<Array<GeneratorResult>> {
    const chunks: Array<Object> = given.slice()
    const results = []

    for (let i = 0, length = chunks.length; i < length; i++) {
      const chunk: FileChunk = chunks[i]
      const chunkMappings = { chunks: {} }

      const childChunks: Map<number, FileChunk> = new Map()
      chunk.files.forEach(function(file) {
        file.getChunks().forEach(function(entry) {
          childChunks.set(entry.id, entry)
        })
      })
      childChunks.forEach(function(entry) {
        chunkMappings.chunks[entry.id] = entry.label
      })

      let result
      for (const entry of this.getComponents('generator')) {
        result = await this.invokeComponent(entry, 'callback', [this.config.output, {
          label: chunk.label,
          mappings: chunkMappings,
        }, generateConfig], [
          chunk,
        ])
        if (result) {
          break
        }
      }
      if (!result) {
        throw new MessageIssue('No generator returned generated contents. Try adding pundle-generator-default to your configuration', 'error')
      }
      // Post-Transformer
      for (const entry of this.getComponents('post-transformer')) {
        const postTransformerResults = await this.invokeComponent(entry, 'callback', [], [result.contents])
        Helpers.mergeResult(result, postTransformerResults)
      }
      results.push(result)
    }

    return results
  }
  serialize(): string {
    const serializedUID = {}
    this.uid.forEach(function(value, key) {
      serializedUID[key] = value
    })

    return JSON.stringify({
      UID: serializedUID,
    })
  }
  unserialize(contents: string, force: boolean = false) {
    if (this.uid.size && !force) {
      throw new Error('Cannot unserialize into non-empty state without force parameter')
    }

    const parsed = JSON.parse(contents)
    // Unserializing UID
    this.uid.clear()
    for (const key in parsed.UID) {
      if (!{}.hasOwnProperty.call(parsed.UID, key)) continue
      this.uid.set(key, parsed.UID[key])
    }
  }
  getUID(label: string): number {
    const uid = (this.uid.get(label) || 0) + 1
    this.uid.set(label, uid)
    return uid
  }
  getChunk(entries: ?Array<FileImport> = null, label: ?string = null, imports: ?Array<FileImport> = null): FileChunk {
    const id = this.getUID('chunk')
    return {
      id,
      label: label || id.toString(),
      files: new Map(),
      entries: entries || [],
      imports: imports || [],
    }
  }
  getImportRequest(request: string, from: ?string = null): FileImport {
    return {
      id: this.getUID('import'),
      request,
      resolved: null,
      from,
      type: 'cjs',
      namespaces: [],
    }
  }
  getComponents(type: ?string = null): Array<ComponentConfigured> {
    const entries = Array.from(this.components)
    if (type) {
      return entries.filter(i => i.component.$type === type)
    }
    return entries
  }
  addComponent(component: ComponentAny, config: Object): void {
    if (!component) {
      throw new Error('Invalid component provided')
    }
    if (component.$apiVersion !== API_VERSION) {
      throw new Error('API version of component mismatches')
    }
    this.components.add({ component, config })
    this.invokeComponent({ component, config }, 'activate', [], [])
    return new Disposable(() => {
      this.deleteComponent(component, config)
    })
  }
  deleteComponent(component: ComponentAny, config: Object): boolean {
    for (const entry of this.components) {
      if (entry.config === config && entry.component === component) {
        this.components.delete(entry)
        this.invokeComponent(entry, 'dispose', [], [])
        return true
      }
    }
    return false
  }
  async invokeComponent(entry: ComponentConfigured, method: string, configs: Array<Object>, parameters: Array<any>): Promise<any> {
    invariant(typeof entry === 'object' && entry, 'Component must be a valid object')
    invariant(typeof entry.component[method] === 'function', `Component method '${method}' does not exist on given component`)

    const mergedConfigs = Object.assign({}, entry.component.defaultConfig, entry.config, ...configs)

    return entry.component[method](this, configs, ...parameters)
  }
}

export { Context }
export default Context
