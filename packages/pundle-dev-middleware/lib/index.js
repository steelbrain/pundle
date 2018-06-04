// @flow

import path from 'path'
import mime from 'mime/lite'
import pick from 'lodash/pick'
import differenceBy from 'lodash/differenceBy'
import { Router } from 'express'

import { getChunkKey } from 'pundle-api'
import getPundle, { type Master } from 'pundle-core'

import { getOutputFormats } from './helpers'

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
    config: {
      output: {
        formats: await getOutputFormats(pick(options, PUNDLE_OPTIONS), publicPath),
        rootDirectory: '/tmp',
      },
    },
  })

  let transformedJob
  const urlToGeneratedContents = {}

  async function regenerateUrlCache({ chunks }) {
    const { outputs } = await master.generate(transformedJob, chunks)
    outputs.forEach(({ filePath, contents }) => {
      if (filePath) {
        urlToGeneratedContents[filePath] = contents
      }
    })
  }

  let lastChunks
  const { queue } = await master.watch({
    async generate({ job }) {
      transformedJob = await master.transformJob(job)
      const currentChunks = Array.from(transformedJob.chunks.values())
      if (!lastChunks) {
        lastChunks = currentChunks
        await regenerateUrlCache({ chunks: currentChunks })
        return
      }
      const addedChunks = differenceBy(currentChunks, lastChunks, getChunkKey)
      lastChunks = currentChunks

      if (addedChunks.length) {
        await regenerateUrlCache({ chunks: currentChunks })
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

      const contents = urlToGeneratedContents[url]
      if (typeof contents === 'undefined') {
        next()
        return
      }
      const mimeType = mime.getType(path.extname(url)) || 'application/octet-stream'
      res.set('content-type', mimeType)
      res.end(contents)
    }),
  )

  return router
}
