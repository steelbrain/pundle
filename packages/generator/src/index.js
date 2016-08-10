/* @flow */
/* eslint-disable no-underscore-dangle */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import * as Helpers from './helpers'
import type Pundle from '../../pundle/src'
import type { File } from '../../pundle/src/types'

const WrapperNormal = FS.readFileSync(Path.join(__dirname, '..', 'wrappers', 'dist', 'normal.js'), 'utf8').trim()
const WrapperHMR = FS.readFileSync(Path.join(__dirname, '..', 'wrappers', 'dist', 'hmr.js'), 'utf8').trim()

export default function generate(pundle: Pundle, givenConfig: Object) {
  let lines = 0
  const config = Helpers.fillConfig(givenConfig)

  const output = []
  const sourceMap = new SourceMapGenerator({
    skipValidation: true,
  })

  if (config.wrapper !== 'none') {
    output.push(';(function(){')
  }
  if (config.wrapper === 'normal') {
    output.push(WrapperNormal)
    lines += Helpers.getLinesCount(WrapperNormal)
  } else if (config.wrapper === 'hmr') {
    output.push(WrapperHMR)
    lines += Helpers.getLinesCount(WrapperHMR)
  } else {
    lines = 1
  }
  for (const file of (config.contents: Array<File>)) {
    const fileContents = file.contents.trim()
    const entry = `__sb_pundle_register('${pundle.getUniquePathID(file.filePath)}', function(module, exports) {\n${fileContents}\n});`
    output.push(entry)

    if (!config.sourceMap) {
      continue
    }

    const entryPath = 'motion:///' + file.filePath.replace('$root', `$${config.projectName}`)
    const entryMap = new SourceMapConsumer(file.sourceMap)
    for (const mapping of entryMap._generatedMappings) {
      sourceMap.addMapping({
        source: entryPath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: lines + mapping.generatedLine, column: mapping.generatedColumn },
      })
    }
    lines += Helpers.getLinesCount(fileContents)
    lines ++
    sourceMap.setSourceContent(entryPath, file.source)
  }
  for (const entry of (config.requires: Array<string>)) {
    output.push(`__require('${pundle.getUniquePathID(entry)}');`)
  }
  if (config.wrapper !== 'none') {
    output.push('})();')
  }

  return {
    contents: output.join(''),
    sourceMap: config.sourceMap ? sourceMap.toJSON() : null,
  }
}
