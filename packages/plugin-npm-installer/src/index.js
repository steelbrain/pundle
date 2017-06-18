/* @flow */

import Path from 'path'
import promiseDefer from 'promise.defer'
import { createResolver, shouldProcess, MessageIssue } from 'pundle-api'
import type { Context } from 'pundle-api/types'

import { getModuleName } from './helpers'
import Installer from './installer'

const locks = new Map()
const name = '$steelbrain$npm$installer'
export default createResolver({
  name,
  async callback(context: Context, config: Object, givenRequest: string, fromFile: ?string, cached: boolean, excluded: Array<string>) {
    if (givenRequest.slice(0, 1) === '.' || Path.isAbsolute(givenRequest)) {
      return null
    }
    const newExcluded = excluded.concat([name])

    try {
      // NOTE: Awaiting and then returning is VERY important
      const result = await context.resolveAdvanced(givenRequest, fromFile, true, newExcluded)
      return result
    } catch (_) { /* No Op */ }

    // NOTE: Make SURE the lock checking is BEFORE should process
    const moduleName = getModuleName(givenRequest)
    const lock = locks.get(moduleName)
    if (lock) {
      await lock
      return context.resolveAdvanced(givenRequest, fromFile, false, newExcluded)
    }
    if (!shouldProcess(context.config.rootDirectory, fromFile, config)) {
      return null
    }

    const deferred = promiseDefer()
    locks.set(moduleName, deferred.promise)
    try {
      await context.resolveAdvanced(`${moduleName}/package.json`, fromFile, true, newExcluded)
      deferred.promise.resolve()
      return null
    } catch (_) { /* No Op */ }

    try {
      if (!config.silent) {
        context.report(new MessageIssue(`Installing '${moduleName}' in ${context.config.rootDirectory}`, 'info'))
      }
      config.beforeInstall(moduleName)
      let error = null
      try {
        await Installer.install(moduleName, config.save, context.config.rootDirectory)
      } catch (_) {
        error = _
      }
      config.afterInstall(moduleName, error)
      if (error && !config.silent) {
        context.report(new MessageIssue(`Failed to install '${moduleName}'`, 'error'))
      } else if (!error && !config.silent) {
        context.report(new MessageIssue(`Installed '${moduleName}' successfully`, 'info'))
      }
    } finally {
      deferred.resolve()
    }
    return context.resolveAdvanced(givenRequest, fromFile, true, newExcluded)
  },
}, {
  save: false,
  silent: false,
  beforeInstall() { /* No Op */ },
  afterInstall() { /* No Op */ },
  include: ['*'],
  exclude: [/(node_modules|bower_components)/],
}, false)
