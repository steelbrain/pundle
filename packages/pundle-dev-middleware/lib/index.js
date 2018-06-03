// @flow

import path from 'path'
import mime from 'mime/lite'
import pick from 'lodash/pick'
import pDebounce from 'p-debounce'
import getPundle, { type Master } from 'pundle-core'
import { Router } from 'express'

type Payload = {
  config?: Object,
  configFileName?: string,
  configLoadFile?: boolean,
  directory?: string,
  // ^ Either directory to initialize pundle from or an instance

  // Used for chunk/image loading and HMR
  publicPath?: string,
  hmr?: boolean,
}
const PUNDLE_OPTIONS = ['config', 'configFileName', 'configLoadFile', 'directory']

export default async function getPundleDevMiddleware(options: Payload) {
  let cachedTransformedJob = null
  const router = new Router()

  const master: Master = await getPundle(pick(options, PUNDLE_OPTIONS))
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
  const getTransformedJob = pDebounce(
    async () => {
      if (!cachedTransformedJob) {
        const chunkPathMap = {}
        const transformedJob = await master.transformJob(job)
        transformedJob.chunks.forEach(chunk => {
          const publicPath = context.getPublicPath(chunk)
          if (publicPath) {
            chunkPathMap[`/${publicPath}`] = chunk
          }
        })
        cachedTransformedJob = {
          transformedJob,
          chunkPathMap,
        }
      }
      return cachedTransformedJob
    },
    0,
    { leading: true },
  )

  router.get('/hmr', function(req, res) {
    res.json({ enabled: !!options.hmr })
  })
  // TODO: Figure out a strategy for .map links
  router.get(
    '*',
    asyncRoute(async function(req, res, next) {
      let { url } = req
      if (url.endsWith('/')) {
        url = `${url}index.html`
      }

      await queue.waitTillIdle()
      const { transformedJob, chunkPathMap } = await getTransformedJob()

      const chunk = chunkPathMap[url]
      if (!chunk) {
        // TODO: Log here
        next()
        return
      }
      // TODO: cache the generation?
      const { outputs } = await master.generate(transformedJob, [chunk])
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
