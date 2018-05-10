// @flow

import browserResolve from 'browser-resolve'
import { createFileResolver } from 'pundle-api'

import manifest from '../package.json'

// TODO: have a config?
export default function({ extensions }: { extensions: Array<string> }) {
  return createFileResolver({
    name: 'pundle-file-resolver',
    version: manifest.version,
    async callback({ request, requestRoot, resolved }) {
      if (resolved) return null

      let resolvedRoot = null
      const response = await new Promise(function(resolve, reject) {
        browserResolve(
          request,
          {
            basedir: requestRoot,
            extensions,
            packageFilter(pkg, pkgroot) {
              resolvedRoot = pkgroot
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

      return {
        request,
        requestRoot,
        resolved: response,
        resolvedRoot,
      }
    },
  })
}
