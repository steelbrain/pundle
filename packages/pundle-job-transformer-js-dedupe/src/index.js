// @flow

import { createJobTransformer } from 'pundle-api'
import { name, version } from '../package.json'

import ManifestRegistry from './manifest-registry'

function createComponent() {
  const manifestRegistry = new ManifestRegistry()

  return createJobTransformer({
    name,
    version,
    async callback({ context, worker, job: jobOrig }) {
      const job = jobOrig.clone()

      const directories = new Set()
      job.files.forEach(({ meta }) => {
        if (meta.directory) {
          directories.add(meta.directory)
        }
      })

      await manifestRegistry.load(Array.from(directories))
      console.log('dedupe transformer')
      return null
    },
  })
}

module.exports = createComponent
