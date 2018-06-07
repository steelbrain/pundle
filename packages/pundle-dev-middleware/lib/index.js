// @flow

import path from 'path'
import mime from 'mime/lite'
import invariant from 'assert'
import pick from 'lodash/pick'
import uniq from 'lodash/uniq'
import { Router } from 'express'

import getPundle, { type Master } from 'pundle-core'

import { getOutputFormats, getChunksAffectedByFiles } from './helpers'

type Payload = {
  configFileName?: string,
  configLoadFile?: boolean,
  directory?: string,
  // ^ Either directory to initialize pundle from or an instance

  hmr?: boolean,
  lazy?: boolean,
  // Used for chunk/image loading and HMR
  publicPath: string,
}
const PUNDLE_OPTIONS = ['configFileName', 'configLoadFile', 'directory']

export default async function getPundleDevMiddleware(options: Payload) {
  invariant(typeof options.publicPath === 'string', 'options.publicPath must be a string')

  const router = new Router()

  let { publicPath = '/' } = options
  if (!publicPath.endsWith('/')) {
    publicPath = `${publicPath}/`
  }

  const master: Master = await getPundle({
    ...pick(options, PUNDLE_OPTIONS),
    config: {
      entry: [require.resolve('./client/hmr-client')],
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
  async function generateJobAsync({ job, changed }) {
    transformedJob = await master.transformJob(job)
    const currentChunks = Array.from(transformedJob.chunks.values())
    if (!lastChunks) {
      lastChunks = currentChunks
      await regenerateUrlCache({ chunks: currentChunks })
      return
    }
    const chunksToRegenerate = getChunksAffectedByFiles(job, currentChunks, changed)
    lastChunks = currentChunks

    if (chunksToRegenerate.length) {
      await regenerateUrlCache({ chunks: chunksToRegenerate })
    }
  }

  let generated
  let lastChanged = []
  function generateJob({ job }) {
    if (!generated) {
      generated = generateJobAsync({ job, changed: uniq(lastChanged) })
      lastChanged = []
    }
    return generated
  }

  let lastJob
  let importsToHmr = []
  const { queue } = await master.watch({
    async generate({ job, changed }) {
      const firstTime = !lastJob

      lastJob = job
      lastChanged = lastChanged.concat(changed)
      generated = null

      if (firstTime) {
        if (!options.lazy) {
          await generateJob({ job })
        }
      } else if (options.hmr) {
        console.log('send hmr now....', importsToHmr)
        importsToHmr = []
      }
    },
    ...(options.hmr
      ? {
          async tick({ newFile }) {
            if (lastJob) {
              importsToHmr.push({ format: newFile.format, filePath: newFile.filePath })
            }
          },
        }
      : {}),
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
  if (options.hmr) {
    router.get(`${publicPath}hmr/listen`, function(req, res) {
      res.on('close', function() {
        console.log('res request ended')
      })
    })
  }

  router.get(
    `${publicPath}*`,
    asyncRoute(async function(req, res, next) {
      let { url } = req
      if (url.endsWith('/')) {
        url = `${url}index.html`
      }

      await queue.waitTillIdle()
      await generateJob({ job: lastJob })

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
