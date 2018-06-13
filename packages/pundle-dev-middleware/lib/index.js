// @flow

import pick from 'lodash/pick'
import path from 'path'
import mime from 'mime/lite'
import invariant from 'assert'
import { Router } from 'express'

import { getPundle, getWatcher } from 'pundle-core'
import { getChunk, getUniqueHash, type Job, type ImportResolved } from 'pundle-api'

import { getOutputFormats, getChunksAffectedByImports } from './helpers'

type Payload = {
  cache?: Object | false,
  configFilePath?: string,
  configLoadFile?: boolean,
  directory?: string,
  // ^ Either directory to initialize pundle from or an instance

  hmr?: boolean,
  lazy?: boolean,
  // Used for chunk/image loading and HMR
  publicPath: string,
}
const PUNDLE_OPTIONS = ['configFilePath', 'configLoadFile', 'directory']

async function getPundleDevMiddleware(options: Payload) {
  invariant(typeof options.publicPath === 'string', 'options.publicPath must be a string')

  const router = new Router()

  let { publicPath = '/' } = options
  if (!publicPath.endsWith('/')) {
    publicPath = `${publicPath}/`
  }

  const pundle = await getPundle({
    ...pick(options, PUNDLE_OPTIONS),
    config: {
      entry: options.hmr ? [require.resolve('./client/hmr-client')] : [],
      output: {
        formats: await getOutputFormats(pick(options, PUNDLE_OPTIONS), publicPath),
        rootDirectory: '/tmp',
      },

      cache:
        options.cache !== false
          ? {
              cacheKey: `watcher-${process.env.NODE_ENV || 'development'}`,
              ...options.cache,
            }
          : false,
    },
  })

  let firstTime = true
  let generated = null
  const filesChanged: Set<ImportResolved> = new Set()
  const filesChangedHMR: Set<ImportResolved> = new Set()
  const hmrConnectedClients = new Set()
  const urlToContents = {}
  const urlToHMRContents = {}

  async function regenerateUrlCache({ chunks, job }) {
    const { outputs } = await pundle.generate(job, chunks)
    outputs.forEach(({ filePath, contents, sourceMap }) => {
      if (filePath) {
        urlToContents[filePath] = contents
        if (sourceMap) {
          urlToContents[`${filePath}.map`] = sourceMap.contents
        }
      }
    })
  }
  async function generateForHMR({ job }: { job: Job }) {
    if (!(filesChangedHMR.size && options.hmr && hmrConnectedClients.size)) {
      return
    }
    const changed = Array.from(filesChangedHMR)
    filesChangedHMR.clear()

    const hmrId = Date.now()
    const hmrChunksByFormat = {}

    changed.forEach(fileImport => {
      if (!hmrChunksByFormat[fileImport.format]) {
        hmrChunksByFormat[fileImport.format] = getChunk(fileImport.format, `hmr-${hmrId}`)
      }
      hmrChunksByFormat[fileImport.format].imports.push(fileImport)
    })
    const hmrChunks: $FlowFixMe = Object.values(hmrChunksByFormat)
    const { outputs } = await pundle.generate(job, hmrChunks)
    outputs.forEach(({ filePath, contents, sourceMap }) => {
      if (filePath) {
        urlToHMRContents[filePath] = contents
        if (sourceMap) {
          urlToHMRContents[`${filePath}.map`] = sourceMap.contents
        }
      }
    })
    const clientInfo = {
      type: 'update',
      paths: outputs.map(item => ({ url: item.filePath, format: item.format })),
      changedFiles: changed,
      changedModules: changed.map(item => getUniqueHash(item)),
    }
    hmrConnectedClients.forEach(client => {
      client.write(`${JSON.stringify(clientInfo)}`)
    })
    console.log(`Writing ${outputs.length} chunks to ${hmrConnectedClients.size} clients`)

    // Remove HMR contents from memory after 60 seconds
    setTimeout(() => {
      outputs.forEach(({ filePath }) => {
        if (filePath) {
          urlToHMRContents[filePath] = null
        }
      })
    }, 60 * 1000)
  }

  async function generateJobAsync({ job, changed }) {
    const transformedJob = await pundle.transformJob(job)
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

  function generateJob({ job }) {
    if (!generated) {
      generated = generateJobAsync({ job, changed: Array.from(filesChanged.values()) })
      filesChanged.clear()
    }
    return generated
  }

  const { queue, job, initialCompile } = await getWatcher({
    pundle,
    async generate({ changed }) {
      changed.forEach(fileImport => {
        filesChanged.add(fileImport)
      })
      generated = null
      await generateForHMR({ job })
    },
    tick({ newFile }) {
      if (options.hmr && !firstTime) {
        filesChangedHMR.add({ format: newFile.format, filePath: newFile.filePath })
      }
    },
  })

  try {
    if (!options.lazy) {
      await initialCompile()
    }
  } catch (_) {
    // Pre-compile if you can, otherwise move on
    // If there's an error, it'll be caught/shown to user on request
  }

  function asyncRoute(callback: (req: Object, res: Object, next: Function) => Promise<void>) {
    return function(req, res, next) {
      callback(req, res, next).catch(error => {
        pundle.report(error)
        next(error)
      })
    }
  }

  router.get(
    `${publicPath}*`,
    asyncRoute(async function(req, res, next) {
      await initialCompile()

      if (req.url.endsWith('.pundle.hmr')) {
        res.write(JSON.stringify({ type: 'status', enabled: !!options.hmr }))
        if (!options.hmr) {
          res.end()
          return
        }
        hmrConnectedClients.add(res)
        // 24 hours
        req.setTimeout(1000 * 60 * 60 * 24)
        res.on('close', function() {
          hmrConnectedClients.delete(res)
        })
        return
      }

      let { url } = req
      if (url.endsWith('/')) {
        url = `${url}index.html`
      }

      function respondWith(output) {
        const mimeType = mime.getType(path.extname(url)) || 'application/octet-stream'
        res.set('content-type', mimeType)
        res.end(output)
      }

      const hmrContents = urlToHMRContents[url]
      if (hmrContents) {
        respondWith(hmrContents)
        return
      }

      await queue.waitTillIdle()
      await generateJob({ job })

      const contents = urlToContents[url]
      if (contents) {
        respondWith(contents)
        return
      }
      next()
    }),
  )

  return router
}

module.exports = getPundleDevMiddleware
