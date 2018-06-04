// @flow

import path from 'path'
import mime from 'mime/lite'
import pick from 'lodash/pick'
import differenceBy from 'lodash/differenceBy'
import { Router } from 'express'

import { getChunkKey } from 'pundle-api'
import getPundle, { type Master } from 'pundle-core'

type Payload = {
  configFileName?: string,
  configLoadFile?: boolean,
  directory?: string,
  // ^ Either directory to initialize pundle from or an instance

  // Used for chunk/image loading and HMR
  publicPath?: string,
  hmr?: boolean,
}
const PUNDLE_OPTIONS = ['configFileName', 'configLoadFile', 'directory']

export default async function getPundleDevMiddleware(options: Payload) {
  const router = new Router()

  let { publicPath = '/' } = options
  if (!publicPath.endsWith('/')) {
    publicPath = `${publicPath}/`
  }

  const master: Master = await getPundle({
    ...pick(options, PUNDLE_OPTIONS),
  })

  let transformedJob
  const urlToGeneratedContents = {}

  async function regenerateUrlCache({ context, chunks }) {
    const { outputs } = await master.generate(transformedJob, chunks)
    outputs.forEach(({ chunk, filePath }) => {
      if (filePath) {
        urlToChunkHash[path.posix.join(publicPath, filePath)] = chunk
      }
      if (chunkPublicPath) {
      }
    })
  }

  let lastChunks
  const { queue } = await master.watch({
    async generate({ job, context }) {
      transformedJob = await master.transformJob(job)
      const currentChunks = Array.from(transformedJob.chunks.values())
      if (!lastChunks) {
        lastChunks = currentChunks
        await regenerateUrlCache({ context, chunks: currentChunks })
        return
      }
      const addedChunks = differenceBy(currentChunks, lastChunks, getChunkKey)
      lastChunks = currentChunks

      if (addedChunks.length) {
        await regenerateUrlCache({ context, chunks: currentChunks })
      }
    },
  })

  function asyncRoute(callback: (req: Object, res: Object, next: Function) => Promise<void>) {
    return function(req, res, next) {
      callback(req, res, next).catch(error => {
        master.report(error)
        next(error)
      })
    }
  }

  router.get(`${publicPath}hmr`, function(req, res) {
    res.json({ enabled: !!options.hmr })
  })
  router.get(
    `${publicPath}*`,
    asyncRoute(async function(req, res, next) {
      let { url } = req
      if (url.endsWith('/')) {
        url = `${url}index.html`
      }

      await queue.waitTillIdle()

      const chunkHash = urlToChunkHash[url]
      const chunk = Array.from(transformedJob.chunks.values()).find(item => getChunkKey(item) === chunkHash)
      if (!chunk) {
        // TODO: Log here
        next()
        return
      }
      // TODO: cache the generation?
      const { outputs } = await master.generate(transformedJob, [chunk])
      outputs.forEach(item => {
        if (item.fileName) {
          urlToChunkHash[item.fileName || ''] = getChunkKey(item.chunk)
        }
      })
      const mimeType = mime.getType(path.extname(url)) || 'application/octet-stream'
      const output = outputs.find(item => url.endsWith(item.fileName || '#'))
      if (!output) {
        // TODO: Log here
        next()
        return
      }
      res.set('content-type', mimeType)
      res.end(output.contents)
    }),
  )

  return router
}
