/* @flow */

import unique from 'lodash.uniq'
import invariant from 'assert'
import sourceMap from 'source-map'
import difference from 'lodash.difference'
import type { File, ComponentAny } from 'pundle-api/types'
import type Compilation from './'
import type { ComponentEntry } from './types'
import type { WatcherConfig } from '../../types'

export function *filterComponents(components: Set<ComponentEntry>, type: string): Generator<ComponentEntry, void, void> {
  for (const entry of components) {
    if (entry.component.$type === type) {
      yield entry
    }
  }
}

// Spec:
// - Validate method to exist on component
// - Clone all Objects in the parameters to make sure components can't override originals
// - Invoke the method requested on component with merged configs as first arg and params as others
export function invokeComponent(thisArg: any, component: ComponentAny, method: string, configs: Array<Object>, ...givenParameters: Array<any>) {
  invariant(typeof component[method] === 'function', `Component method '${method}' does not exist on given component`)
  const parameters = givenParameters.map(function(item) {
    if (item && item.constructor === Object) {
      return Object.assign({}, item)
    }
    return item
  })
  return component[method].apply(thisArg, [Object.assign({}, component.defaultConfig, ...configs)].concat(parameters))
}

// Shamelessly copied from babel/babel under MIT License
export function mergeSourceMap(inputMap: Object, map: Object): Object {
  const inputMapConsumer = new sourceMap.SourceMapConsumer(inputMap)
  const outputMapConsumer = new sourceMap.SourceMapConsumer(map)

  const mergedGenerator = new sourceMap.SourceMapGenerator({
    file: inputMapConsumer.file,
    sourceRoot: inputMapConsumer.sourceRoot,
    skipValidation: true,
  })

  // This assumes the output map always has a single source, since Babel always compiles a single source file to a
  // single output file.
  const source = outputMapConsumer.sources[0]

  inputMapConsumer.eachMapping(function(mapping) {
    const generatedPosition = outputMapConsumer.generatedPositionFor({
      line: mapping.generatedLine,
      column: mapping.generatedColumn,
      source,
    })
    if (typeof generatedPosition.column !== 'undefined') {
      mergedGenerator.addMapping({
        source: mapping.source,

        original: !mapping.source ? null : {
          line: mapping.originalLine,
          column: mapping.originalColumn,
        },

        generated: generatedPosition,
      })
    }
  })

  const mergedMap = mergedGenerator.toJSON()
  inputMap.mappings = mergedMap.mappings
  return inputMap
}

// Notes:
// - If we have sourceMap of previous steps but not of latest one, nuke previous sourceMap, it's invalid now
export function mergeResult(file: File, result: ?{ contents: string, sourceMap: ?Object }): void {
  if (!result) {
    return
  }
  if (file.sourceMap && !result.sourceMap) {
    file.sourceMap = null
  } else if (file.sourceMap && result.sourceMap) {
    file.sourceMap = mergeSourceMap(file.sourceMap, result.sourceMap)
  } else if (!file.sourceMap && result.sourceMap) {
    file.sourceMap = result.sourceMap
  }
  file.contents = result.contents
}

// Notes:
// - If usePolling on config object doesn't exist, check env for existance
export function fillWatcherConfig(config: Object): WatcherConfig {
  const toReturn = {}

  invariant(typeof config === 'object' && config, 'Watcher config must be an object')
  if ({}.hasOwnProperty.call(config, 'usePolling')) {
    toReturn.usePolling = !!config.usePolling
  } else {
    toReturn.usePolling = {}.hasOwnProperty.call(process.env, 'PUNDLE_WATCHER_USE_POLLING')
  }
  if (config.tick) {
    invariant(typeof config.tick === 'function', 'config.tick must be a function')
    toReturn.tick = config.tick
  } else toReturn.tick = function() { }
  if (config.update) {
    invariant(typeof config.update === 'function', 'config.update must be a function')
    toReturn.update = config.update
  } else toReturn.update = function() { }
  if (config.ready) {
    invariant(typeof config.ready === 'function', 'config.ready must be a function')
    toReturn.ready = config.ready
  } else toReturn.ready = function() { }
  invariant(typeof config.compile === 'function', 'config.compile must be a function')
  toReturn.compile = config.compile

  return toReturn
}

// Notes:
// Lock as early as resolved to avoid duplicates
// Recurse asyncly until all resolves are taken care of
// Set resolved paths on all file#imports
export async function processFileTree(compilation: Compilation, files: Map<string, File>, path: string, from: ?string = null, cached: boolean = true): Promise<string> {
  const resolved = await compilation.resolve(path, from, cached)
  if (files.has(resolved)) {
    return resolved
  }
  // $FlowIgnore: We are using an invalid-ish flow type on purpose, 'cause flow is dumb and doesn't understand that we *fix* these nulls two lines below
  files.set(resolved, null)
  const file = await compilation.processFile(resolved, from, cached)
  files.set(resolved, file)
  await Promise.all(Array.from(file.imports).map(entry =>
    processFileTree(compilation, files, entry.request, resolved, cached).then(function(resolvedImport) {
      entry.resolved = resolvedImport
    })
  ))
  return resolved
}

// Spec:
// - Exit with success if file already exists and force is not set
// - If oldValue is null, then it means it's already being processed
//   Exit with success
// - Try to:
//   - Process the file
//   - Resolve all imports and set their resolved values on the Set
// - Exit with failure in case of error, while still triggering config.tick()
//   with the error object, also revert the file state to last
// - Trigger config.tick() without the error object in case of success
// - Diff the new and old imports
// - Watch new imports and unwatch old imports
// - Try to:
//   - Resolve all imports recursively
//   - Return a array.every result of all the return values
// - Exit with failure in case of error
export async function processWatcherFileTree(
  compilation: Compilation,
  config: WatcherConfig,
  watcher: Object,
  files: Map<string, File>,
  filePath: string,
  force: boolean,
  from: ?string
): Promise<boolean> {
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
  let processError = null
  try {
    // $FlowIgnore: Allow null
    files.set(filePath, null)
    file = await compilation.processFile(filePath, from)
    files.set(filePath, file)
    await Promise.all(Array.from(file.imports).map(entry => compilation.resolve(entry.request, filePath).then(resolved => {
      entry.resolved = resolved
    })))
  } catch (error) {
    // $FlowIgnore: Allow null
    files.set(filePath, oldValue)
    processError = error
    compilation.report(error)
    return false
  } finally {
    for (const entry of filterComponents(compilation.components, 'watcher')) {
      try {
        await invokeComponent(this, entry.component, 'tick', [entry.config], filePath, processError)
      } catch (error) {
        compilation.report(error)
      }
    }
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
    const promises = await Promise.all(Array.from(file.imports).map((entry: Object) =>
      processWatcherFileTree(compilation, config, watcher, files, entry.resolved, false, filePath)
    ))
    return promises.every(i => i)
  } catch (compilationError) {
    compilation.report(compilationError)
    return false
  }
}

export function getAllKnownExtensions(components: Set<ComponentEntry>): Array<string> {
  let toReturn = ['']
  for (const component of filterComponents(components, 'loader')) {
    if (component.config.extensions) {
      toReturn = toReturn.concat(component.config.extensions)
    } else if (component.component.defaultConfig.extensions) {
      toReturn = toReturn.concat(component.component.defaultConfig.extensions)
    }
  }
  return unique(toReturn)
}
