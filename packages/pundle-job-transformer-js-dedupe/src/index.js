// @flow

import path from 'path'
import escapeRegexp from 'escape-regexp'
import cloneDeep from 'lodash/cloneDeep'
import { createJobTransformer, getUniqueHash } from 'pundle-api'

import { name, version } from '../package.json'
import ManifestRegistry from './manifest-registry'

function createComponent() {
  const DEBUG = process.env.PUNDLE_DEBUG_DEDUPE === '1'
  const manifestRegistry = new ManifestRegistry()

  return createJobTransformer({
    name,
    version,
    async callback({ job: jobOrig }) {
      const job: typeof jobOrig = jobOrig.clone()

      const directories = new Set()
      job.files.forEach(({ meta }) => {
        if (meta.directory) {
          directories.add(meta.directory)
        }
      })

      await manifestRegistry.load(Array.from(directories))

      job.files.forEach((file, fileKey) => {
        const { meta } = file
        if (!meta.directory) return

        const fileManifest = manifestRegistry.getManifestForPath(path.dirname(file.filePath))
        if (!fileManifest) {
          if (DEBUG) {
            console.log(`No manifest found for '${file.filePath}'. Was this file loaded from a resolver alias?`)
          }
          return
        }

        const newFile: typeof file = cloneDeep(file)
        job.files.set(fileKey, newFile)

        newFile.imports.forEach((fileImport, index) => {
          const importManifest = manifestRegistry.getManifestForPath(
            fileImport.meta.directory || path.dirname(fileImport.filePath),
          )
          if (!importManifest) {
            if (DEBUG) {
              console.log(
                `No manifest found for import '${fileImport.filePath}' from '${
                  newFile.filePath
                }'. Was this file loaded from a resolver alias?`,
              )
            }
            return
          }

          if (importManifest === fileManifest) {
            return
          }

          const fileImportSemver = fileManifest.dependencies[importManifest.name]

          if (!fileImportSemver) {
            if (DEBUG) {
              console.log(
                `Ignoring import '${fileImport.filePath}' because it was not found in '${newFile.filePath}' dependencies`,
              )
            }

            return
          }
          const latestManifest = manifestRegistry.getPackageMatchingSemver(importManifest.name, fileImportSemver)
          if (!latestManifest) {
            if (DEBUG) {
              console.log(
                `Unable to get semver-compatible alternatives for '${importManifest.directory}' in '${newFile.filePath}'`,
              )
            }
            return
          }
          if (latestManifest === importManifest) {
            return
          }

          if (DEBUG) {
            console.log(
              `Using '${latestManifest.directory}' instead of '${importManifest.directory}' for '${file.filePath}'`,
            )
          }

          const updatedImport = {
            format: fileImport.format,
            filePath: fileImport.filePath.replace(importManifest.directory, latestManifest.directory),
            meta: {
              ...fileImport.meta,
              directory: latestManifest.directory,
            },
          }
          newFile.imports[index] = updatedImport

          if (typeof newFile.contents === 'string') {
            newFile.contents = newFile.contents.replace(
              new RegExp(escapeRegexp(getUniqueHash(fileImport)), 'g'),
              getUniqueHash(updatedImport),
            )
          }
        })
      })

      return {
        job,
      }
    },
  })
}

module.exports = createComponent
