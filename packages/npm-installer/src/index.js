/* @flow */

import Installer from './installer'
import { getModuleName } from './helpers'
import type Pundle from '../../pundle/src'

const IGNORED = /(node_modules|bower_components)/

export default function getNPMInstaller(pundle: Pundle, parameters: Object) {
  parameters = Object.assign({
    save: true,
    rootDirectory: pundle.config.rootDirectory,
  }, parameters)
  const installer = new Installer(parameters)
  if (!(parameters.ignored instanceof RegExp)) {
    parameters.ignored = IGNORED
  }

  const queue: Map<string, Promise<void>> = new Map()
  const locks: Set<string> = new Set()

  pundle.resolver.onAfterResolve(async function(event) {
    if (locks.has(event.givenRequest)) {
      return
    }
    const moduleName = getModuleName(event.filePath)
    if (!moduleName) {
      return
    }
    if (event.resolved || event.fromFile.indexOf(pundle.config.rootDirectory) !== 0 || parameters.ignored.test(event.fromFile)) {
      return
    }

    // NOTE: Handle when module is installed, just that particular file doesn't exist -- Ignore
    locks.add(moduleName)
    let rootResolveError = null
    try {
      await pundle.resolver.resolveUncached(moduleName, event.fromFile, event.givenRequest, event.manifest)
    } catch (error) {
      rootResolveError = error
    } finally {
      locks.delete(moduleName)
    }
    if (!rootResolveError) {
      return
    }

    let queueValue = queue.get(moduleName)
    if (!queueValue) {
      queue.set(moduleName, queueValue = new Promise(function(resolve) {
        parameters.beforeInstall(moduleName)
        resolve(installer.install(moduleName))
      }).then(function() {
        return parameters.afterInstall(moduleName, null)
      }, function(error) {
        return parameters.afterInstall(moduleName, error)
      }).then(function() {
        queue.delete(moduleName)
      }))
    }

    await queueValue
    locks.add(event.givenRequest)
    try {
      const result = pundle.resolver.resolveUncached(event.filePath, event.fromFile, event.givenRequest, event.manifest)
      event.resolved = true
      event.filePath = result
    } finally {
      locks.delete(event.givenRequest)
    }
  })
}
