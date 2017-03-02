/* @flow */

import semver from 'semver'
import reporterCli from 'pundle-reporter-cli'
import { Disposable } from 'sb-event-kit'
import { version as API_VERSION, getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { File, ComponentAny, FileImport, Resolved } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { ComponentEntry, CompilationConfig } from '../../types'

let uniqueID = 0

export default class Context {
  config: CompilationConfig;
  components: Set<ComponentEntry>;

  constructor(config: CompilationConfig) {
    this.config = config
    this.components = new Set()
  }
  async report(report: Object): Promise<void> {
    let tried = false
    for (const entry of Helpers.filterComponents(this.components, 'reporter')) {
      await Helpers.invokeComponent(this, entry, 'callback', [], report)
      tried = true
    }
    if (!tried) {
      Helpers.invokeComponent(this, { config: {}, component: reporterCli }, 'callback', [], report)
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
  getImportRequest(request: string, from: string): FileImport {
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
    if (!component) {
      throw new Error('Invalid component provided')
    }
    if (!semver.satisfies(component.$apiVersion, `^${API_VERSION.split('.')[0]}`)) {
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
}
