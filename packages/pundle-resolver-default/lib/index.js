// @flow

import path from 'path'
import flatten from 'lodash/flatten'
import browserResolve from 'browser-resolve'
import { createFileResolver } from 'pundle-api'

import manifest from '../package.json'

export default function({ formats, aliases = {} }: { formats: { [string]: string }, aliases: { [string]: string } }) {
  // TODO: validation of config?

  return createFileResolver({
    name: 'pundle-file-resolver',
    version: manifest.version,
    // TODO: Respect the `format` parameter?
    async callback({ request, requestFile, resolved }, { rootDirectory }) {
      if (resolved) return null

      let resolvedRoot = null
      const response = await new Promise(function(resolve, reject) {
        browserResolve(
          request,
          {
            modules: aliases,
            basedir: requestFile ? path.dirname(requestFile) : rootDirectory,
            extensions: flatten(Object.values(formats)),
            packageFilter(pkg, pkgroot) {
              resolvedRoot = path.dirname(pkgroot)
              return pkg
            },
          },
          function(err, res) {
            if (err) reject(err)
            else resolve(res)
          },
        )
      })

      if (!response) return null

      const ext = path.extname(response)
      const format = Object.keys(formats).find(entry => formats[entry].includes(ext))
      if (!format) {
        console.error(`File was resolved as '${response}' but extension '${ext}' is not recognized`)
        return null
      }

      return {
        request,
        requestFile,
        format,
        resolved: response,
        resolvedRoot,
      }
    },
  })
}
