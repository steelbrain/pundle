// @flow

import fs from 'sb-fs'
import path from 'path'
import { SourceMapGenerator } from 'source-map'
import { createChunkGenerator, getUniqueHash } from 'pundle-api'

import * as Helpers from './helpers'
import manifest from '../package.json'

const VALID_TARGET = new Set(['node', 'browser'])
function createComponent({ target }: { target: 'node' | 'browser' }) {
  if (!VALID_TARGET.has(target)) {
    throw new Error(`Invalid target '${target}' specified`)
  }

  const wrapperNode = fs.readFile(path.join(__dirname, 'wrapper', 'node.js'), 'utf8')
  const wrapperBrowser = fs.readFile(path.join(__dirname, 'wrapper', 'browser.js'), 'utf8')

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

      const contents = [
        ';(function(){',
        await (target === 'browser' ? wrapperBrowser : wrapperNode),
        `sbPundleChunkLoading(${JSON.stringify(context.getPublicPath(chunk))});`,
      ]
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

      const output: Object = {
        contents: '',
        sourceMap: null,
        format: chunk.format,
      }

      const publicPath = context.getPublicPath(chunk)
      if (sourceMapPath) {
        output.sourceMap = { contents: JSON.stringify(sourceMap.toJSON()), filePath: sourceMapPath }
        contents.push(`//# sourceMappingURL=${path.posix.relative(path.dirname(publicPath), sourceMapPath)}`)
      }
      output.contents = contents.join('\n')
      return output
    },
  })
}

module.exports = createComponent
