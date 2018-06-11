// @flow

import fs from 'fs'
import path from 'path'
import { SourceMapGenerator } from 'source-map'
import { createChunkGenerator, getUniqueHash } from 'pundle-api'

import * as Helpers from './helpers'
import manifest from '../package.json'

const wrapper = fs.readFileSync(path.join(__dirname, 'wrapper', 'default.js'))

// TODO: have a config?
function createComponent() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-js',
    version: manifest.version,
    async callback({ chunk, job, context }) {
      if (chunk.format !== 'js') return null

      const sourceMap = new SourceMapGenerator({
        skipValidation: true,
      })
      const sourceMapPath = context.getPublicPath({
        ...chunk,
        format: `${chunk.format}.map`,
      })
      const { files } = Helpers.getContentForOutput(chunk, job)

      const contents = [';(function(){', wrapper]
      let sourceMapOffset = Helpers.getLinesCount(contents.join('\n')) + 1

      for (const file of files) {
        const fileContents = `sbPundleModuleRegister(${JSON.stringify(
          getUniqueHash(file),
        )}, function(module, require, exports, __filename, __dirname) {\n${file.contents.toString()}\n});`
        if (sourceMapPath) {
          if (file.sourceMap) {
            await Helpers.mergeSourceMap(file.sourceMap, sourceMap, sourceMapOffset, file.filePath)
          }
          sourceMapOffset += Helpers.getLinesCount(fileContents)
        }
        contents.push(fileContents)
      }
      if (chunk.entry) {
        const chunkEntryId = getUniqueHash(chunk)
        contents.push(`sbPundleModuleGenerate('$root')(${JSON.stringify(chunkEntryId)})`)
      }
      contents.push(`sbPundleChunkLoaded(${JSON.stringify(context.getPublicPath(chunk))});`)

      contents.push('})();')

      const output = {
        contents: ('': any),
        sourceMap: (null: any),
        format: chunk.format,
      }

      if (sourceMapPath) {
        output.sourceMap = { contents: JSON.stringify(sourceMap.toJSON()) }
        contents.push(`//# sourceMappingURL=${sourceMapPath}`)
      }
      output.contents = contents.join('\n')
      return output
    },
  })
}

module.exports = createComponent
