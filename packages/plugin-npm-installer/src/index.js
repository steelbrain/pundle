/* @flow */

import Path from 'path'
import promiseDefer from 'promise.defer'
import { createResolver, shouldProcess, MessageIssue } from 'pundle-api'
import type { Context } from 'pundle-api/types'

import { getModuleName } from './helpers'
import Installer from './installer'

// Spec:
// Do not attempt to install local modules
// Do not attempt to install if request is resolvable
// Do not attempt to install if request doesn't pass inclusion/exclusion requirements
// Do not attempt to install if moduleName/package.json can be resolved
// Invoke beforeInstall before installing the package
// Try spawning npm and await on it, then invoke afterInstall callback
// If invocation was successful, try resolving again and output whatever you get (do not catch)

const locks = new Map()
export default createResolver(async function(context: Context, config: Object, givenRequest: string, fromFile: ?string) {
  if (givenRequest.slice(0, 1) === '.' || Path.isAbsolute(givenRequest)) {
    return null
  }

  try {
    return await context.resolve(givenRequest, fromFile, true)
  } catch (_) { /* No Op */ }
  if (!shouldProcess(context.config.rootDirectory, fromFile, config)) {
    return null
  }

  const moduleName = getModuleName(givenRequest)
  try {
    await context.resolve(`${moduleName}/package.json`, fromFile)
    return null
  } catch (_) { /* No Op */ }

  const lock = locks.get(moduleName)
  if (lock) {
    return lock
  }
  const deferred = promiseDefer()
  locks.set(moduleName, deferred.promise)

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
    deferred.resolve(context.resolve(givenRequest, fromFile, false))
  }
  // This is, unfortunately, required. Making it wait on all installations saves us from a few race conditions
  await Promise.all(locks.values())
  return deferred.promise
}, {
  save: false,
  silent: false,
  beforeInstall() { /* No Op */ },
  afterInstall() { /* No Op */ },
  include: ['*'],
  exclude: [/(node_modules|bower_components)/],
}, false)
