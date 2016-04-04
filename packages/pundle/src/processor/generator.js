'use strict'

/* @flow */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import { getLinesCount } from '../helpers'
import type Pundle from '../index'
import type { Pundle$Module } from '../types'

let rootContent = ''

function getContent(
  filePath: string,
  modules: Map<string, Pundle$Module>,
  imported: Set<string>,
  content: Array<{ filePath: string, contents: string, sourceMap: Object }>
) {
  const module = modules.get(filePath)
  if (!module) {
    throw new Error(`Module '${filePath}' not found`)
  }
  content.push({ filePath: module.filePath, contents: module.contents, sourceMap: module.sourceMap })
  imported.add(filePath)

  for (const entry of module.imports) {
    if (!imported.has(entry)) {
      getContent(entry, modules, imported, content)
    }
  }
}

export function generateBundle(pundle: Pundle, modules: Map<string, Pundle$Module>): string {
  if (!rootContent) {
    rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js')).toString()
  }
  const content = []
  const imported = new Set()
  for (const entry of pundle.config.entry) {
    getContent(pundle.path.in(entry), modules, imported, content)
  }

  // One line up for IIFE
  const output = []

  // Default
  output.push(rootContent)

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

export function generateSourceMap(pundle: Pundle, modules: Map<string, Pundle$Module>): Object {
  if (!rootContent) {
    rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js')).toString()
  }
  const content = []
  const imported = new Set()
  for (const entry of pundle.config.entry) {
    getContent(pundle.path.in(entry), modules, imported, content)
  }
  const sourceMap = new SourceMapGenerator()
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
    sourceMap.setSourceContent(internalPath, entry.contents)
  }
  return sourceMap.toJSON()
}
