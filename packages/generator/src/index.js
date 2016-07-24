/* @flow */

import FS from 'fs'
import Path from 'path'
import { SourceMapGenerator } from 'source-map'
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
    const entry = `__sb_pundle_register('${pundle.getUniquePathID(file.filePath)}', function(module, exports) {\n${file.contents.trim()}\n});`
    lines += Helpers.getLinesCount(entry)
    output.push(entry)
  }
  for (const entry of (requires: Array<string>)) {
    output.push(`__require('${pundle.getUniquePathID(entry)}')`)
  }

  return {
    contents: output.join(''),
    sourceMap: sourceMap.toJSON(),
    lines,
  }
}
