// @flow

import { posix } from 'path'
import { createGenerator, MessageIssue } from 'pundle-api'
import { SourceMapGenerator } from 'source-map'

import { version } from '../package.json'
import * as Helpers from './helpers'

const ALLOWED_TYPES = ['string', 'boolean', 'number']

export default function() {
  return createGenerator({
    name: 'pundle-generator-browser',
    version,
    async callback(context, options, chunk, job) {
      // TODO: Wrappers
      const contents = [';(function(){']
      const sourceMap = new SourceMapGenerator({
        skipValidation: true,
      })
      const definedVariables = {
        PUNDLE_USE_GLOBALS: !!options.useGlobals,
        PUNDLE_PUBLIC_DIRECTORY: posix.relative('/', options.publicDirectory),
        ...options.definedVariables,
      }

      for (const [key, value] of Object.entries(definedVariables)) {
        if (!ALLOWED_TYPES.includes(typeof value)) {
          throw new MessageIssue(
            `definedVariables.${key} has an invalid type of ${typeof value}, allowed types are: ${ALLOWED_TYPES.join(', ')}`,
          )
        }
        contents.push(`var ${key} = ${JSON.stringify(value)}`)
      }
      contents.push(await Helpers.getWrapperContents(context, options.wrapper))

      let offset = Helpers.getLinesCount(contents)
      const chunkMap = Helpers.getSimpleChunkMap(chunk, job.files)

      chunkMap.files.forEach(file => {
        const fileContents = `__sbPundle.moduleRegister(${JSON.stringify(
          file.fileName,
        )}, function(__filename, __dirname, require, module, exports) {\n${file.contents}\n});`
        contents.push(fileContents)
        if (file.sourceMap) {
          Helpers.mergeSourceMap(file.sourceMap, sourceMap, file, offset)
        }
        offset += Helpers.getLinesCount(fileContents)
      })

      if (chunkMap.chunks.size) {
        const chunkEntriesMap = {}
        chunkMap.chunks.forEach(entry => {
          if (entry.entry) chunkEntriesMap[entry.entry] = entry.label
        })
        contents.push(`sbPundle.registerMap(${JSON.stringify(chunkEntriesMap)})`)
      }
      contents.push(`sbPundle.registerChunk(${JSON.stringify(chunk.label)}, ${JSON.stringify(chunk.entry)})`)

      contents.push('})();\n')

      return {
        contents: contents.join('\n'),
        sourceMap: sourceMap.toJSON(),
      }
    },
    defaultOptions: {
      wrapper: 'normal', // or 'hmr',
      definedVariables: {},

      useGlobals: true, // maps to PUNDLE_USE_GLOBALS
      publicDirectory: '/', // maps to PUNDLE_PUBLIC_DIRECTORY
    },
    // TODO: Inline sourceMaps?
  })
}
