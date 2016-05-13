'use strict'

/* @flow */

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
    const internalPath = pundle.path.in(entry.filePath)
    output.push(
      `${config.module_register}('${internalPath}', function(module, exports){\n${entry.contents}\n}); // ${internalPath} ends\n`
    )
  }
  for (const entry of requires) {
    if (entry === '$internal') {
      continue
    }
    output.push(
      `__require('${pundle.path.in(entry)}');\n`
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
  const sourceMap = new SourceMapGenerator({
    skipValidation: true
  })

  if (config.prepend) {
    lines += getLinesCount(config.prepend)
  }
  for (const entry of content) {
    const entryPath = 'motion:///' + pundle.path.in(entry.filePath)
    const entryMap = new SourceMapConsumer(entry.sourceMap)
    for (const mapping of entryMap._generatedMappings) {
      sourceMap.addMapping({
        source: entryPath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: lines + mapping.generatedLine, column: mapping.generatedColumn }
      })
    }
    lines += getLinesCount(entry.contents)
    lines += 2
    sourceMap.setSourceContent(entryPath, entry.sources)
  }

  return sourceMap.toJSON()
}
