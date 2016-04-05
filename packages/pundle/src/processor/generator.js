'use strict'

/* @flow */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import { getLinesCount } from '../helpers'
import type Pundle from '../index'
import type { Pundle$Module } from '../types'

const rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js'), 'utf8')

export function generateBundle(pundle: Pundle, entryPoints: Array<string>, content: Array<Pundle$Module>): string {
  const output = [rootContent]

  for (const entry of content) {
    const internalPath = pundle.path.in(entry.filePath)
    const internalContent = `var __filename = '${internalPath}'` +
      `, __dirname = '${Path.posix.dirname(internalPath)}';\n${entry.contents}`
    output.push(
      `__sb_pundle_register('${internalPath}', function(module, exports){\n${internalContent}\n})`
    )
  }
  for (const entry of entryPoints) {
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
    const internalPath = 'motion:///' + pundle.path.in(entry.filePath)
    lines += 2
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
