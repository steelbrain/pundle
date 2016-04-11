'use strict'

/* @flow */

import Path from 'path'
import Installer from './installer'
import type Pundle from '../../pundle/src'

let nextID = 0
const IGNORED = /(node_modules|bower_components)/

function getNPMInstaller(pundle: Pundle, parameters: Object) {
  parameters = Object.assign({
    save: true,
    rootDirectory: pundle.config.rootDirectory
  }, parameters)
  const installer = new Installer(parameters)
  if (!(parameters.ignored instanceof RegExp)) {
    parameters.ignored = /(node_modules|bower_components)/
  }

  pundle.path.onAfterModuleResolve(function(event) {
    if (event.path || event.basedir.indexOf(pundle.config.rootDirectory) !== 0 || event.basedir.match(IGNORED)) {
      return null
    }
    const id = ++nextID
    if (parameters.onBeforeInstall) {
      parameters.onBeforeInstall(id, event.moduleName)
    }
    return installer.install(event.moduleName).then(function() {
      event.path = Path.join(parameters.rootDirectory, 'node_modules', event.moduleName)
      if (parameters.onBeforeInstall) {
        parameters.onAfterInstall(id, event.moduleName, null)
      }
    }, function(error) {
      if (parameters.onBeforeInstall) {
        parameters.onAfterInstall(id, event.moduleName, error)
      }
    })
  })
}

module.exports = getNPMInstaller
