'use strict'

/* @flow */

import FS from 'fs'
import Path from 'path'
import type Pundle from '../index'
import type { Pundle$Module } from '../types'

let rootContent = ''

function getContent(
  filePath: string,
  modules: Map<string, Pundle$Module>,
  imported: Set<string>,
  content: Array<{ filePath: string, contents: string }>
) {
  const module = modules.get(filePath)
  if (!module) {
    throw new Error(`Module '${filePath}' not found`)
  }
  content.push({ filePath: module.filePath, contents: module.contents })
  imported.add(filePath)

  for (const entry of module.imports) {
    if (!imported.has(entry)) {
      getContent(entry, modules, imported, content)
    }
  }
}

export default function generateBundle(pundle: Pundle, modules: Map<string, Pundle$Module>): string {
  if (!rootContent) {
    rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js')).toString()
  }
  const content = []
  const imported = new Set()
  const processedContent = []
  for (const entry of pundle.config.entry) {
    getContent(pundle.path.in(entry), modules, imported, content)
  }
  for (const entry of content) {
    processedContent.push(
      `__sb_pundle_register('${pundle.path.in(entry.filePath)}', function(module, exports){\n${entry.contents}\n})`
    )
  }
  for (const entry of pundle.config.entry) {
    processedContent.push(
      `require('${pundle.path.in(entry)}')`
    )
  }
  return rootContent.slice(0, -6) + processedContent.join('\n') + '\n' + rootContent.slice(-6)
}
