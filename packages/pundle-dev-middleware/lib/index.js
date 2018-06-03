// @flow

import pick from 'lodash/pick'
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
  let cachedChunkPathMap = null
  const router = new Router()

  const master: Master = await getPundle(pick(options, PUNDLE_OPTIONS))
  const { job, queue, context } = await master.watch({
    generate() {
      cachedChunkPathMap = null
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
  function getChunkPathMap() {
    if (!cachedChunkPathMap) {
      const chunkPathMap = {}
      job.chunks.forEach(chunk => {
        const publicPath = context.getPublicPath(chunk)
        if (publicPath) {
          chunkPathMap[`/${publicPath}`] = chunk
        }
      })
      cachedChunkPathMap = chunkPathMap
    }
    return cachedChunkPathMap
  }

  router.get('/hmr', function(req, res) {
    res.json({ enabled: !!options.hmr })
  })
  router.get(
    '*',
    asyncRoute(async function(req, res, next) {
      let { url } = req
      if (url.endsWith('/')) {
        url = `${url}index.html`
      }

      await queue.waitTillIdle()
      const chunkPathMap = getChunkPathMap()

      const chunk = chunkPathMap[url]
      console.log('okay', chunk)
    }),
  )

  return router
}
