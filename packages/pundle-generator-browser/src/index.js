// @flow

import { createGenerator } from 'pundle-api'
import { SourceMapGenerator } from 'source-map'

import { version } from '../package.json'
import * as Helpers from './helpers'

export default function() {
  return createGenerator({
    name: 'pundle-generator-browser',
    version,
    async callback(context, options, chunk, files) {
      // TODO: Wrappers
      const contents = [';(function(){']
      const sourceMap = new SourceMapGenerator({
        skipValidation: true,
      })

      let offset = Helpers.getLinesCount(contents)
      const chunkMap = Helpers.getChunkMap(chunk, files)

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

      contents.push('})();\n')

      return {
        contents: contents.join('\n'),
        sourceMap: sourceMap.toJSON(),
      }
    },
    defaultOptions: {},
    // TODO: Inline sourceMaps?
  })
}
