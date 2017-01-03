/* @flow */

import Path from 'path'
import sourceMapToComment from 'source-map-to-comment'
import { createGenerator } from 'pundle-api'
import { SourceMapGenerator } from 'source-map'
import type { File } from 'pundle-api/types'
import * as Helpers from './helpers'

// Spec:
// - Merge both plugin config and runtime config into one
// - Normalize and resolve all given entries
// - Get contents of wrappers
// - Create an chunks contents array
// - Create an source map generator
// - On each file:
//   - Get public path of each file
//   - Generate wrapped contents
//   - Update lines count based on newly generated contnets
//   - Include source map (if exists) into the chunks source map
// - Push map of registered mappings into chunks
// - Push all requires into chunks
// - Push sourceMap stringified or it's path (depending on config) (if enabled)
// - Return all chunks joined, and sourceMap (if enabled)

export default createGenerator(async function(config: Object, files: Array<File>) {
  const entry = await Helpers.normalizeEntry(this, config)
  const wrapperContents = await Helpers.getWrapperContents(this, config)

  const chunks = [';(function() {', wrapperContents]
  const chunksMap = new SourceMapGenerator({
    skipValidation: true,
  })
  const filePaths = []
  // NOTE: I don't know why we need a +1, but adding it makes things work
  let linesCount = Helpers.getLinesCount(chunks.join('\n')) + 1

  for (let i = 0, length = files.length; i < length; i++) {
    const file = files[i]
    const publicPath = Helpers.getFilePath(this, config, file.filePath)
    const fileContents = `__sbPundle.registerModule("${publicPath}", function(__filename, __dirname, require, module, exports) {\n${file.contents}\n});`
    chunks.push(fileContents)
    filePaths.push(publicPath)
    const fileSourceMap = file.sourceMap
    if (config.sourceMap && fileSourceMap) {
      const sourceMapPath = Path.join(`$${config.sourceMapNamespace}`, Path.relative(this.config.rootDirectory, file.filePath))
      Helpers.mergeSourceMap(fileSourceMap, chunksMap, `pundle:///${sourceMapPath}`, file.source, linesCount)
    }
    linesCount += Helpers.getLinesCount(fileContents)
  }

  const resolutionMap = JSON.stringify(Helpers.getImportResolutions(this, config, files))
  chunks.push(`__sbPundle.registerMappings(${resolutionMap})`)
  for (let i = 0, length = entry.length; i < length; i++) {
    chunks.push(`__sbPundle.require('${Helpers.getFilePath(this, config, entry[i])}')`)
  }
  chunks.push('})();\n')

  let sourceMap = null
  if (config.sourceMap) {
    sourceMap = chunksMap.toJSON()
    if (config.sourceMapPath === 'inline') {
      chunks.push(sourceMapToComment(sourceMap))
    } else if (config.sourceMapPath) {
      chunks.push(`//# sourceMappingURL=${config.sourceMapPath}`)
    }
  }

  return {
    contents: chunks.join('\n'),
    sourceMap,
    filePaths,
  }
}, {
  entry: null,
  wrapper: 'normal',
  pathType: 'filePath',
  sourceMap: false,
  sourceMapPath: null,
  sourceNamespace: 'app',
  sourceMapNamespace: 'app',
})
