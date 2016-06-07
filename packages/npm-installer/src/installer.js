'use strict'

/* @flow */

import { exec } from 'sb-exec'
import { isNPMError } from './helpers'
import type { Config } from './types'

export default class Installer {
  config: Config;

  constructor(config: Config) {
    this.config = config
  }
  async install(name: string): Promise<void> {
    const parameters = ['install']
    if (this.config.save) {
      parameters.push('--save')
    }
    parameters.push(name, '--loglevel=error', '--no-color')
    const result = await exec('npm', parameters, {
      cwd: this.config.rootDirectory,
      stream: 'stderr',
      allowEmptyStderr: true,
    })
    if (result && isNPMError(result)) {
      throw new Error(`NPM Error: ${result}`)
    }
  }
  async uninstall(name: string): Promise<void> {
    const parameters = ['uninstall']
    if (this.config.save) {
      parameters.push('--save')
    }
    parameters.push(name, '--loglevel=error', '--no-color')
    const result = await exec('npm', parameters, {
      cwd: this.config.rootDirectory,
      stream: 'stderr',
      allowEmptyStderr: true,
    })
    if (result && isNPMError(result)) {
      throw new Error(`NPM Error: ${result}`)
    }
  }
}
