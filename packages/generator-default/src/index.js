/* @flow */

import { createGenerator } from 'pundle-api'
import { SourceMapGenerator } from 'source-map'
import type { File } from 'pundle-api/types'
import * as Helpers from './helpers'

// Spec:
// - Merge both plugin config and runtime config into one
// - Normalize and resolve all given entries
// - Get contents of wrappers
// - Create an output contents array
// - Create an source map generator
// - On each file:
//   - Get public path of each file
//   - Generate wrapped contents
//   - Update lines count based on newly generated contnets
//   - Include source map (if exists) into the output source map
// - Push map of registered mappings into output
// - Push all requires into output
// - Return all output joined, and sourceMap (if enabled)

export default createGenerator(async function(givenConfig: Object, files: Array<File>, givenRuntimeConfig: Object) {
  const config = Object.assign({}, givenConfig, givenRuntimeConfig)
  const entry = await Helpers.normalizeEntry(this, config)
  const wrapperContents = await Helpers.getWrapperContents(this, config)

  const output = [';(function() {', wrapperContents]
  const outputMap = new SourceMapGenerator({
    skipValidation: true,
  })
  let linesCount = Helpers.getLinesCount(output.join(''))

  for (let i = 0, length = files.length; i < length; i++) {
    const file = files[i]
    const publicPath = Helpers.getFilePath(this, config, file.filePath)
    const fileContents = `__sbPundle.registerModule("${publicPath}", function(__filename, __dirname, require, module, exports) {\n${file.contents}\n});`
    output.push(fileContents)
    linesCount += Helpers.getLinesCount(fileContents)
    if (config.sourceMap && file.sourceMap) {
      Helpers.mergeSourceMap(file.sourceMap, outputMap, file.filePath, file.source, linesCount)
    }
  }

  const resolutionMap = JSON.stringify(Helpers.getImportResolutions(this, config, files))
  output.push(`__sbPundle.registerMappings(${resolutionMap})`)

  for (let i = 0, length = entry.length; i < length; i++) {
    output.push(`__sbPundle.require('${Helpers.getFilePath(this, config, entry[i])}')`)
  }
  output.push('})();')

  return {
    contents: output.join('\n'),
    sourceMap: config.sourceMap ? outputMap.toJSON() : null,
  }
}, {
  entry: null,
  wrapper: 'normal',
  filename: null,
  pathType: 'filePath',
  directory: null,
  sourceMap: false,
  sourceMapNamespace: 'app',
})
