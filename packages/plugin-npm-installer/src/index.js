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
  // TODO: Temporarily disabling plugin-npm-installer in this release because it doesn't work
  return null
}, {
  save: false,
  silent: false,
  beforeInstall() { /* No Op */ },
  afterInstall() { /* No Op */ },
  include: ['*'],
  exclude: [/(node_modules|bower_components)/],
}, false)
