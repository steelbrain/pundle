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

export default function({
  extensionsOrMimes,
  inlineLimit = DEFAULT_INLINE_LIMIT,
}: { extensionsOrMimes: Array<string> | { [string]: string }, inlineLimit: number } = {}) {
  invariant(
    typeof extensionsOrMimes === 'object' && extensionsOrMimes,
    'extensionsOrMimes must be provided to transformer-static',
  )

  function getMimeTypeByExtension(extension: string): string {
    if (!Array.isArray(extensionsOrMimes) && extensionsOrMimes[extension]) {
      return extensionsOrMimes[extension]
    }
    return mime.getType(extension) || 'application/octet-stream'
  }
  const recognizedExtensions: Array<string> = Array.isArray(extensionsOrMimes)
    ? extensionsOrMimes
    : Object.keys(extensionsOrMimes)

  return createFileTransformer({
    name: 'pundle-transformer-static',
    version: manifest.version,
    priority: 2000,
    callback({ contents, filePath, format }, { addChunk, getFileName }) {
      const extName = path.extname(filePath)
      if (!recognizedExtensions.includes(extName)) {
        return null
      }

      if (format === 'static') {
        // Keep as is
        return null
      }

      const shouldUseDataUrl = contents.length <= inlineLimit

      let url
      if (shouldUseDataUrl) {
        const contentsBuffer = typeof contents === 'string' ? Buffer.from(contents) : contents
        url = `data:${getMimeTypeByExtension(extName)};base64,${contentsBuffer.toString('base64')}`
      } else {
        const chunk = getChunk('static', null, filePath)
        addChunk(chunk)
        url = getFileName(chunk)
      }

      if (format === 'js') {
        // required in a JS file
        return {
          contents: `module.exports = ${JSON.stringify(url)}`,
          sourceMap: null,
        }
      }

      throw new Error(`Unexpected format '${format}' encountered in static transformer`)
    },
  })
}
