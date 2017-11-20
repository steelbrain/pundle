// @flow

import path from 'path'
import pMap from 'p-map'
import { createJobTransformer, normalizeFileName } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createJobTransformer({
    name: 'pundle-job-transformer-static-injector',
    version,
    async callback(context, options, job) {
      await pMap(options.files, async file => {
        const resolved = path.resolve(context.config.rootDirectory, file)
        const relative = normalizeFileName(path.relative(context.config.rootDirectory, resolved))
        const extName = path.extname(relative)
        const nameWithoutExt = extName ? path.basename(relative).slice(0, -extName.length) : relative

        job.files.set(relative, await context.getFile(relative, false))
        job.chunks.push(context.getFileChunk(relative, nameWithoutExt))
      })

      return {
        job,
      }
    },
    defaultOptions: {
      // Example:
      // files: ['public/index.html', 'public/favicon.ico'],
      files: [],
    },
  })
}
