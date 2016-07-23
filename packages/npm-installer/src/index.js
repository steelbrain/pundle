/* @flow */

import Installer from './installer'
import { getModuleName } from './helpers'
import type Pundle from '../../pundle/src'

const IGNORED = /(node_modules|bower_components)/

export default function getNPMInstaller(pundle: Pundle, parameters: Object) {
  parameters = Object.assign({
    save: true,
    rootDirectory: pundle.config.rootDirectory
  }, parameters)
  const installer = new Installer(parameters)
  if (!(parameters.ignored instanceof RegExp)) {
    parameters.ignored = IGNORED
  }

  const queue: Map<string, Promise<void>> = new Map()

  pundle.resolver.onAfterResolve(function(event) {
    if (event.resolved || event.fromFile.indexOf(pundle.config.rootDirectory) !== 0 || parameters.ignored.test(event.fromFile)) {
      return null
    }
    const moduleName = getModuleName(event.filePath)
    if (!moduleName) {
      return null
    }
    let queueValue = queue.get(event.filePath)
    if (!queueValue) {
      queue.set(event.filePath, queueValue = new Promise(function(resolve) {
        parameters.beforeInstall(moduleName)
        resolve(installer.install(moduleName))
      }).then(function() {
        queue.delete(event.filePath)
        return pundle.resolver.resolveUncached(event.filePath, event.fromFile, event.givenRequest, event.manifest)
      }).then(function(result) {
        event.resolved = true
        event.filePath = result
      }, function(error) {
        if (error.message.indexOf('Cannot find module') === 0) {
          return
        }
        parameters.error(error)
      }))
    }
    return queueValue
  })
}
