'use strict'

/* @flow */

import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import { getLinesCount } from './helpers'
import type Pundle from '../index'
import type { Module, ProcessorConfig } from '../types'

export function generateBundle(
  pundle: Pundle,
  config: ProcessorConfig,
  content: Array<Module>,
  requires: Array<string>
): string {
  const output = [config.prepend || '']

  for (const entry of content) {
    let strictMode = false
    let processedContents = entry.contents
    if (processedContents.slice(1, 11) === 'use strict') {
      processedContents = processedContents.substr(processedContents.indexOf('\n', 1) + 1)
      strictMode = true
    }
    const internalPath = pundle.path.in(entry.filePath)
    const internalContent = `${strictMode ? "'use strict';\n" : ''}var __filename = '${internalPath}', __dirname = '${Path.posix.dirname(internalPath)}';\n${processedContents}`
    output.push(
      `${config.module_register}('${internalPath}', function(module, exports, require){\n${internalContent}\n}); // ${internalPath} ends\n`
    )
  }
  for (const entry of requires) {
    if (entry === '$root') {
      continue
    }
    output.push(
      `${config.module_require}('${pundle.path.in(entry)}');\n`
    )
  }
  output.push(config.append || '')
  return output.join('')
}

export function generateSourceMap(
  pundle: Pundle,
  config: ProcessorConfig,
  content: Array<Module>
): Object {
  let lines = 0
  const sourceMap = new SourceMapGenerator()

  if (config.prepend) {
    lines += getLinesCount(config.prepend)
  }
  for (const entry of content) {
    const entryPath = 'motion:///' + pundle.path.in(entry.filePath)
    const entryMap = new SourceMapConsumer(entry.sourceMap)
    lines += 1 // For the opening of register function and declration of basic variables
    for (const mapping of entryMap._generatedMappings) {
      sourceMap.addMapping({
        source: entryPath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: lines + mapping.generatedLine, column: mapping.generatedColumn }
      })
    }
    lines += getLinesCount(entry.contents)
    lines += 2  // I don't know why we need two but it only works if we have two so I don't care
    sourceMap.setSourceContent(entryPath, entry.sources)
  }

  return sourceMap.toJSON()
}
