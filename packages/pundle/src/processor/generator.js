'use strict'

/* @flow */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import { getLinesCount } from '../helpers'
import type Pundle from '../index'
import type { Pundle$Module } from '../types'

const rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js'), 'utf8')

export function generateBundle(pundle: Pundle, content: Array<Pundle$Module>): string {
  const output = [rootContent]

  for (const entry of content) {
    const internalPath = pundle.path.in(entry.filePath)
    output.push(
      `__sb_pundle_register('${internalPath}', function(module, exports){\n${entry.contents}\n})`
    )
  }
  for (const entry of pundle.config.entry) {
    output.push(
      `require('${pundle.path.in(entry)}')`
    )
  }
  return `;(function(){\n${output.join('\n')}\n})();\n`
}

export function generateSourceMap(pundle: Pundle, content: Array<Pundle$Module>): Object {
  const sourceMap = new SourceMapGenerator()
  // One line for IIFE
  let lines = 1 + getLinesCount(rootContent)

  for (const entry of content) {
    const internalPath = pundle.path.in(entry.filePath)
    lines += 1
    const consumer = new SourceMapConsumer(entry.sourceMap)
    for (const mapping of consumer._generatedMappings) {
      sourceMap.addMapping({
        source: internalPath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: lines + mapping.generatedLine, column: mapping.generatedColumn }
      })
    }
    lines += getLinesCount(entry.contents) + 1
    sourceMap.setSourceContent(internalPath, entry.sources)
  }
  return sourceMap.toJSON()
}
