'use strict'


/* @flow */

import FS from 'fs'
import Path from 'path'
import type { Pundle$State, Pundle$Module } from '../types'

let rootContent = ''

function getContent(
  filePath: string,
  modules: Map<string, Pundle$Module>,
  imported: Set<string>,
  content: Array<{ filePath: string, content: string }>
) {
  const module = modules.get(filePath)
  if (!module) {
    throw new Error(`Module '${filePath}' not found`)
  }
  content.push({ filePath: module.filePath, content: module.content })
  imported.add(filePath)

  for (const entry of module.imports) {
    if (!imported.has(entry)) {
      getContent(entry, modules, imported, content)
    }
  }
}

export default function generateBundle(state: Pundle$State, modules: Map<string, Pundle$Module>): string {
  if (!rootContent) {
    rootContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'client', 'root.js')).toString()
  }
  const content = []
  const imported = new Set()
  const processedContent = []
  for (const entry of state.config.entry) {
    getContent(state.puth.in(entry), modules, imported, content)
  }
  for (const entry of content) {
    processedContent.push(
      `__sb_pundle_register('${state.puth.in(entry.filePath)}', function(module, exports){\n${entry.content}\n})`
    )
  }
  for (const entry of state.config.entry) {
    processedContent.push(
      `require('${state.puth.in(entry)}')`
    )
  }
  return rootContent.slice(0, -6) + processedContent.join('\n') + '\n' + rootContent.slice(-6)
}
