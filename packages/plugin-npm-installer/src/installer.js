/* @flow */

import { exec } from 'sb-exec'

export default {
  async install(name: string, save: boolean, rootDirectory: string): Promise<void> {
    const parameters = ['install']
    if (save) {
      parameters.push('--save')
    }
    parameters.push(name, '--loglevel=error', '--no-color')
    const result = await exec('npm', parameters, {
      cwd: rootDirectory,
      stream: 'stderr',
      allowEmptyStderr: true,
    })
    if (result && result.indexOf('npm ERR') !== -1) {
      throw new Error(`NPM Error: ${result}`)
    }
  },
}
