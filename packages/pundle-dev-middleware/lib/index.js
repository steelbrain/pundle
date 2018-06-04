// @flow

import path from 'path'
import mime from 'mime/lite'
import pick from 'lodash/pick'
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
  let cachedTransformedJob = null
  const urlToChunkHash = {}
  const router = new Router()

  let { publicPath = '/' } = options
  if (!publicPath.endsWith('/')) {
    publicPath = `${publicPath}/`
  }

  const master: Master = await getPundle({
    ...pick(options, PUNDLE_OPTIONS),
  })
  const { job, queue, context } = await master.watch({
    generate() {
      cachedTransformedJob = null
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
  async function getTransformedJobAsync() {
    const chunkPathMap = {}
    const transformedJob = await master.transformJob(job)
    transformedJob.chunks.forEach(chunk => {
      const chunkPublicPath = context.getPublicPath(chunk)
      if (chunkPublicPath) {
        chunkPathMap[path.posix.join(publicPath, chunkPublicPath)] = chunk
      }
    })
    return {
      transformedJob,
      chunkPathMap,
    }
  }
  function getTransformedJob() {
    if (!cachedTransformedJob) {
      cachedTransformedJob = getTransformedJobAsync()
    }
    return cachedTransformedJob
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
      const { transformedJob, chunkPathMap } = await getTransformedJob()

      let chunk = chunkPathMap[url]
      if (!chunk && urlToChunkHash[url]) {
        const chunkHash = urlToChunkHash[url]
        chunk = Array.from(transformedJob.chunks.values()).find(item => getChunkKey(item) === chunkHash)
      }
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
