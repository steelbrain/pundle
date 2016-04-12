'use strict'

/* @flow */

import Path from 'path'
import Installer from './installer'
import { shouldInstall, getModuleName } from './helpers'
import type Pundle from '../../pundle/src'

let nextID = 0
const IGNORED = /(node_modules|bower_components)/

function getNPMInstaller(pundle: Pundle, parameters: Object) {
  parameters = Object.assign({
    save: true,
    restrictToRoot: false,
    rootDirectory: pundle.config.rootDirectory
  }, parameters)
  const installer = new Installer(parameters)
  if (!(parameters.ignored instanceof RegExp)) {
    parameters.ignored = /(node_modules|bower_components)/
  }
  const locks: Map<string, Promise> = new Map()

  pundle.path.onAfterModuleResolve(function(event) {
    if (event.path || (parameters.restrictToRoot && event.basedir.indexOf(pundle.config.rootDirectory) !== 0) || event.basedir.match(IGNORED) || shouldInstall(event.moduleName)) {
      return null
    }
    let lock = locks.get(event.moduleName)
    if (lock) {
      return lock.then(function(status) {
        if (status) {
          event.path = Path.join(parameters.rootDirectory, 'node_modules', event.moduleName)
        }
      })
    }
    const id = ++nextID
    if (parameters.onBeforeInstall) {
      parameters.onBeforeInstall(id, event.moduleName)
    }
    lock = installer.install(getModuleName(event.moduleName)).then(function() {
      event.path = Path.join(parameters.rootDirectory, 'node_modules', event.moduleName)
      if (parameters.onBeforeInstall) {
        parameters.onAfterInstall(id, event.moduleName, null)
      }
      locks.delete(event.moduleName)
      return true
    }, function(error) {
      if (parameters.onBeforeInstall) {
        parameters.onAfterInstall(id, event.moduleName, error)
      }
      locks.delete(event.moduleName)
    })
    locks.set(event.moduleName, lock)
    return lock
  })
}

module.exports = getNPMInstaller
