// @flow

import path from 'path'
import resolve from 'resolve'
import browserResolve from 'browser-resolve'
import browserAliases from 'pundle-resolver-aliases-browser'
import { registerComponent } from 'pundle-api'
import type { ResolvePayload } from 'pundle-api/types'

import { version } from '../package.json'

export const MODULE_SEPARATOR_REGEX = /\/|\\/
function isModuleDefault(request: string): boolean {
  const chunks = request.split(MODULE_SEPARATOR_REGEX)
  return chunks.length === 1
}
function promisedResolve(
  browserEnv: boolean,
  request: string,
  options: Object,
): Promise<?string> {
  return new Promise(function(resolvePromise, rejectPromise) {
    const resolver = browserEnv ? browserResolve : resolve
    resolver(request, options, function(error, resolved) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        rejectPromise(error)
      } else {
        resolvePromise(resolved || null)
      }
    })
  })
}

export default function() {
  return registerComponent({
    name: 'pundle-resolver-node',
    version,
    hookName: 'resolve',
    async callback(context, options, payload: ResolvePayload) {
      const browserEnv = context.config.target === 'browser'
      const resolved = await promisedResolve(browserEnv, payload.request, {
        basedir: payload.requestRoot,
        moduleDirectory: options.moduleDirectories,
        packageFilter(packageManifest, manifestPath) {
          payload.resolvedRoot = path.dirname(manifestPath)
          if (isModuleDefault(payload.request)) {
            options.packageMains.some(function(packageMain) {
              const value = packageManifest[packageMain]
              if (value && typeof value === 'string') {
                packageManifest.main = value
                return true
              }
              return false
            })
          }
        },
        ...(browserEnv ? { modules: browserAliases } : {}),
      })
      if (resolved) {
        if (!payload.resolvedRoot) {
          payload.resolvedRoot = payload.requestRoot
        }
        payload.resolved = resolved
      }
    },
    defaultOptions: {
      packageMains: ['main'],
      extensions: ['', '.js', '.json'],
      moduleDirectories: ['node_modules'],
    },
  })
}
