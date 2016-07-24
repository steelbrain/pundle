/* @flow */
/* eslint-disable no-underscore-dangle */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import * as Helpers from './helpers'
import type Pundle from '../../pundle/src'
import type { File } from '../../pundle/src/types'

const WrapperNormal = FS.readFileSync(Path.join(__dirname, '..', 'wrappers', 'normal.js'), 'utf8')
const WrapperHMR = FS.readFileSync(Path.join(__dirname, '..', 'wrappers', 'hmr.js'), 'utf8')

export default function generate(pundle: Pundle, contents: Array<File>, requires: Array<string>, givenConfig: Object) {
  let lines = 0
  const config = Helpers.fillConfig(givenConfig)

  const output = []
  const sourceMap = new SourceMapGenerator({
    skipValidation: true,
  })

  if (config.wrapper === 'normal') {
    output.push(WrapperNormal)
    lines += Helpers.getLinesCount(WrapperNormal)
  } else if (config.wrapper === 'hmr') {
    output.push(WrapperHMR)
    lines += Helpers.getLinesCount(WrapperHMR)
  }
  for (const file of (contents: Array<File>)) {
    const entryPath = file.filePath.replace('$root', `$${config.projectName}`)
    const entryMap = new SourceMapConsumer(file.sourceMap)
    const entry = `__sb_pundle_register('${pundle.getUniquePathID(file.filePath)}', function(module, exports) {\n${file.contents.trim()}\n});`
    for (const mapping of entryMap._generatedMappings) {
      sourceMap.addMapping({
        source: entryPath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: lines + mapping.generatedLine, column: mapping.generatedColumn },
      })
    }
    lines += Helpers.getLinesCount(entry)
    lines += 2
    sourceMap.setSourceContent(entryPath, file.source)
    output.push(entry)
  }
  for (const entry of (requires: Array<string>)) {
    output.push(`__require('${pundle.getUniquePathID(entry)}')`)
  }

  return {
    contents: output.join(''),
    sourceMap: sourceMap.toJSON(),
  }
}
