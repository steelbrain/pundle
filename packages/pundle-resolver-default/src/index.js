// @flow

import path from 'path'
import invariant from 'assert'
import flatten from 'lodash/flatten'
import browserResolve from 'browser-resolve'
import { createFileResolver } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ formats, aliases = {} }: { formats: { [string]: string }, aliases: { [string]: string } }) {
  invariant(formats && typeof formats === 'object', 'options.formats must be a valid object')
  invariant(aliases && typeof aliases === 'object', 'options.aliases must be a valid object')

  return createFileResolver({
    name: 'pundle-file-resolver',
    version: manifest.version,
    async callback({ request, requestFile, context }) {
      const response = await new Promise(function(resolve, reject) {
        browserResolve(
          request,
          {
            modules: aliases,
            basedir: requestFile ? path.dirname(requestFile) : context.config.rootDirectory,
            extensions: flatten(Object.values(formats)),
          },
          function(err, res) {
            if (err) reject(err)
            else resolve(res)
          },
        )
      })

      if (!response) return null

      if (process.env.PUNDLE_DEBUG_RESOLVER === '1') {
        console.log('From', requestFile, 'processed', request, 'to', response)
      }

      const ext = path.extname(response)
      const format = Object.keys(formats).find(entry => formats[entry].includes(ext))
      if (!format) {
        console.error(`File was resolved as '${response}' but extension '${ext}' is not recognized`)
        return null
      }

      return {
        format,
        filePath: response,
      }
    },
  })
}

module.exports = createComponent
