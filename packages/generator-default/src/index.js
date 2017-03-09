/* @flow */

import Path from 'path'
import invariant from 'assert'
import sourceMapToComment from 'source-map-to-comment'
import { createGenerator } from 'pundle-api'
import { SourceMapGenerator } from 'source-map'
import type { Context, FileChunk, GeneratorResult } from 'pundle-api/types'
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

export default createGenerator(async function(context: Context, config: Object, chunk: FileChunk): Promise<GeneratorResult> {
  const entries = chunk.entries
  const filesGenerated = []
  const wrapperContents = await Helpers.getWrapperContents(context, config)

  const chunks = [';(function() {', wrapperContents]
  const chunksMap = new SourceMapGenerator({
    skipValidation: true,
  })
  // NOTE: I don't know why we need a +1, but adding it makes things work
  let linesCount = Helpers.getLinesCount(chunks.join('\n')) + 1

  for (const file of chunk.files.values()) {
    const publicPath = Helpers.getFilePath(context, config, file.filePath)
    const fileContents = `__sbPundle.registerModule("${publicPath}", function(__filename, __dirname, require, module, exports) {\n${file.contents}\n});`
    const fileSourceMap = file.sourceMap

    chunks.push(fileContents)
    filesGenerated.push(publicPath)

    if (config.sourceMap) {
      if (fileSourceMap) {
        const sourceMapPath = Path.join(`$${config.sourceMapNamespace}`, Path.relative(context.config.rootDirectory, file.filePath))
        Helpers.mergeSourceMap(fileSourceMap, chunksMap, `pundle:///${sourceMapPath}`, file.source, linesCount)
      }
      linesCount += Helpers.getLinesCount(fileContents)
    }
  }

  const mappings = Object.assign({}, config.mappings, {
    files: Object.assign({}, Helpers.getFileMappings(context, chunk, config), config.mappings.files),
  })
  chunks.push(`__sbPundle.registerMappings(${JSON.stringify(mappings)})`)
  chunks.push(`__sbPundle.registerLoaded(${JSON.stringify(config.label)})`)
  for (let i = 0, length = entries.length; i < length; i++) {
    invariant(entries[i].resolved, `Entry file '${entries[i].request}' was not resolved`)
    chunks.push(`__sbPundle.require('${Helpers.getFilePath(context, config, entries[i].resolved)}')`)
  }
  chunks.push('})();\n')

  const sourceMap = chunksMap.toJSON()
  if (config.sourceMap) {
    if (config.sourceMapPath === 'inline') {
      chunks.push(sourceMapToComment(sourceMap))
    }
  }

  return {
    chunk,
    contents: chunks.join('\n'),
    sourceMap,
    filesGenerated,
  }
}, {
  label: '',
  wrapper: 'normal',
  pathType: 'filePath',
  mappings: {},
  sourceMap: false,
  bundlePath: '',
  publicRoot: '',
  sourceMapPath: null,
  sourceNamespace: 'app',
  sourceMapNamespace: 'app',
})
