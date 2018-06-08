// @flow

import path from 'path'
import mime from 'mime/lite'
import invariant from 'assert'
import pick from 'lodash/pick'
import { Router } from 'express'

import getPundle, { type Master } from 'pundle-core'
import type { ImportResolved } from 'pundle-api'

import { getOutputFormats, getChunksAffectedByImports } from './helpers'

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
  const filesChanged: Set<ImportResolved> = new Set()
  const urlToGeneratedContents = {}

  async function regenerateUrlCache({ chunks, job }) {
    const { outputs } = await master.generate(job, chunks)
    outputs.forEach(({ filePath, contents }) => {
      if (filePath) {
        urlToGeneratedContents[filePath] = contents
      }
    })
  }

  let firstTime = true
  async function generateJobAsync({ job, changed }) {
    const transformedJob = await master.transformJob(job)
    const chunks = Array.from(transformedJob.chunks.values())
    if (firstTime) {
      firstTime = false
      await regenerateUrlCache({ job: transformedJob, chunks })
      return
    }
    const chunksToRegenerate = getChunksAffectedByImports(job, chunks, changed)

    if (chunksToRegenerate.length) {
      await regenerateUrlCache({ job: transformedJob, chunks: chunksToRegenerate })
    }
  }

  let generated = null
  function generateJob({ job }) {
    if (!generated) {
      generated = generateJobAsync({ job, changed: Array.from(filesChanged.values()) })
      filesChanged.clear()
    }
    return generated
  }

  const { queue, job } = await master.watch({
    async generate({ changed }) {
      changed.forEach(fileImport => {
        filesChanged.add(fileImport)
      })
      generated = null
      if (options.hmr) {
        console.log('send hmr now....', changed)
      }
    },
  })
  if (!options.lazy) {
    await generateJob({ job })
  }

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
      await generateJob({ job })

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
