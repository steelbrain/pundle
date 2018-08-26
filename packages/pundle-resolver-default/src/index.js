// @flow

import path from 'path'
import invariant from 'assert'
import flatten from 'lodash/flatten'
import browserResolve from 'browser-resolve'
import browserAliases from 'pundle-resolver-aliases-browser'
import { isCore } from 'resolve'
import { createFileResolver } from 'pundle-api'

import manifest from '../package.json'

function createComponent({
  formats,
  aliases = {},
  external = [],
  mainFields = ['jsxnext:main', 'module'],
}: {
  formats: { [string]: string },
  aliases: { [string]: string },
  external: Array<string>,
  mainFields: Array<string>,
}) {
  invariant(formats && typeof formats === 'object', 'options.formats must be a valid object')
  invariant(aliases && typeof aliases === 'object', 'options.aliases must be a valid object')
  invariant(external && Array.isArray(external), 'options.external must be an Array')
  invariant(mainFields && Array.isArray(mainFields), 'options.mainFields must be an Array')

  if (mainFields.includes('browser')) {
    throw new Error("options.mainFields must not include 'browser'")
  }

  return createFileResolver({
    name: manifest.name,
    version: manifest.version,
    async callback({ request, requestFile, context, meta }) {
      if (external.length > 0 && request[0] !== '.') {
        const requestModule = request.split('/')[0]
        if (external.includes(requestModule)) {
          return {
            meta,
            format: false,
            filePath: false,
          }
        }
      }

      let response = await new Promise(function(resolve, reject) {
        browserResolve(
          request,
          {
            modules: {
              ...(context.config.target === 'browser' ? browserAliases : {}),
              ...aliases,
            },
            basedir: requestFile ? path.dirname(requestFile) : context.config.rootDirectory,
            extensions: flatten(Object.values(formats)),
            /* eslint-disable no-param-reassign */
            packageFilter(packageManifest) {
              mainFields.forEach(function(mainField) {
                if (typeof packageManifest[mainField] === 'string') {
                  packageManifest.main = packageManifest[mainField]
                }
              })
              return packageManifest
            },
            /* eslint-enable no-param-reassign */
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

      if (isCore(response)) {
        if (context.config.target === 'node') {
          return {
            meta,
            format: false,
            filePath: false,
          }
        }
        response = browserAliases._pundle_empty
      }

      const ext = path.extname(response)
      const format = Object.keys(formats).find(entry => formats[entry].includes(ext))
      if (!format) {
        console.error(`File was resolved as '${response}' but extension '${ext}' is not recognized`)
        return null
      }

      return ({
        meta,
        format,
        filePath: response,
      }: Object)
    },
  })
}

module.exports = createComponent
