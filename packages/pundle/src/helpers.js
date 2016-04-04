'use babel'

/* @flow */

import Path from 'path'
import sourceMap from 'source-map'
import type Pundle$Path from './path'
import type { Pundle$Config, Pundle$FileSystem } from './types'

let FileSystem
const REGEX_EOL = /\n|\r\n/

export function normalizeConfig(givenConfig: Pundle$Config): Pundle$Config {
  const config = Object.assign({}, givenConfig)
  // Make sure config.entry is an array
  if (!Array.isArray(config.entry)) {
    config.entry = [config.entry]
  }
  // Make sure config.entry is filled with absolute paths
  for (let i = 0; i < config.entry.length; ++i) {
    const entry = config.entry[i]
    if (!Path.isAbsolute(entry)) {
      config.entry[i] = Path.join(config.rootDirectory, entry)
    }
  }
  // Make sure we have a FileSystem on board
  if (!config.FileSystem) {
    if (!FileSystem) {
      FileSystem = require('pundle-fs')
    }
    config.FileSystem = FileSystem
  }
  if (!config.resolve) {
    config.resolve = {}
  }
  config.sourceMaps = Boolean(config.sourceMaps)
  return config
}

export async function find(
  directory: string,
  name: string | Array<string>,
  fs: Pundle$FileSystem
): Promise<Array<string>> {
  const names = [].concat(name)
  const chunks = directory.split(Path.sep)
  const matched = []

  while (chunks.length) {
    let currentDir = chunks.join(Path.sep)
    if (currentDir === '') {
      currentDir = Path.resolve(directory, '/')
    }
    for (const fileName of names) {
      const filePath = Path.join(currentDir, fileName)
      try {
        await fs.stat(filePath)
        matched.push(filePath)
        break
      } catch (_) {
        // Do nothing
      }
    }
    chunks.pop()
  }

  return matched
}

export async function getPlugins(
  plugins: Array<string | Function>,
  path: Pundle$Path,
  rootDirectory: string
): Promise<Array<Function>> {
  const processed = []
  for (const plugin of plugins) {
    if (typeof plugin === 'function') {
      processed.push(plugin)
    } else {
      // $FlowIgnore: Sorry flow, but plugins are dynamic
      const mainModule = require(await path.resolveModule(plugin, rootDirectory))
      if (typeof module !== 'function') {
        throw new Error(`Plugin '${plugin}' did not export properly`)
      }
      processed.push(mainModule)
    }
  }
  return processed
}

// Source: https://goo.gl/821D9T
export function mergeSourceMaps(inputMap: Object, map: Object): Object {
  const inputMapConsumer   = new sourceMap.SourceMapConsumer(inputMap)
  const outputMapConsumer  = new sourceMap.SourceMapConsumer(map)

  const mergedGenerator = new sourceMap.SourceMapGenerator({
    file: inputMapConsumer.file,
    sourceRoot: inputMapConsumer.sourceRoot
  })

  // This assumes the output map always has a single source, since Babel always compiles a single source file to a
  // single output file.
  const source = outputMapConsumer.sources[0]

  inputMapConsumer.eachMapping(function(mapping) {
    const generatedPosition = outputMapConsumer.generatedPositionFor({
      line: mapping.generatedLine,
      column: mapping.generatedColumn,
      source
    })
    if (typeof generatedPosition.column !== 'undefined') {
      mergedGenerator.addMapping({
        source: mapping.source,

        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn
        },

        generated: generatedPosition
      })
    }
  })

  const mergedMap = mergedGenerator.toJSON()
  inputMap.mappings = mergedMap.mappings
  return inputMap
}

export function getLinesCount(text: string): number {
  return text.split(REGEX_EOL).length
}
