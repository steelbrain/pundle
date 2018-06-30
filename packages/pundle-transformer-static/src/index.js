// @flow

import path from 'path'
import mime from 'mime/lite'
import invariant from 'assert'
import { getChunk, createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

/*
 * Options {
 *  extensions: Array of string extensions | Object of extension to mime type mapping
 * }
 */

const DEFAULT_INLINE_LIMIT = 8 * 1024 // 8kb

function createComponent({
  extensions,
  inlineLimit = DEFAULT_INLINE_LIMIT,
}: { extensions: Array<string> | { [string]: string }, inlineLimit: number } = {}) {
  invariant(Array.isArray(extensions), 'extensions must be provided to transformer-static')

  function getMimeTypeByExtension(extension: string): string {
    return mime.getType(extension) || 'application/octet-stream'
  }

  return createFileTransformer({
    name: 'pundle-transformer-static',
    version: manifest.version,
    priority: 2000,
    async callback({ file, addChunk, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) {
        return null
      }

      if (file.format === 'static') {
        // Keep as is
        return null
      }

      const shouldUseDataUrl = file.contents.length <= inlineLimit

      let url
      if (shouldUseDataUrl) {
        const contentsBuffer = typeof file.contents === 'string' ? Buffer.from(file.contents) : file.contents
        url = `data:${getMimeTypeByExtension(extName)};base64,${contentsBuffer.toString('base64')}`
      } else {
        const chunk = getChunk('static', null, file.filePath)
        await addChunk(chunk)
        url = context.getPublicPath(chunk)
      }

      if (file.format === 'js') {
        // required in a JS file
        return {
          contents: `module.exports = ${JSON.stringify(url)}`,
          sourceMap: false,
        }
      }

      throw new Error(`Unexpected format '${file.format}' encountered in static transformer`)
    },
  })
}

module.exports = createComponent
