// @flow

import url from 'url'
import get from 'lodash/get'
import pick from 'lodash/pick'
import defaults from 'lodash/defaults'
import path from 'path'
import mime from 'mime/lite'
import invariant from 'assert'
import { Router } from 'express'

import { getPundle, getWatcher } from 'pundle-core'
import { getChunk, getUniqueHash, type Job, type ImportResolved } from 'pundle-api'

import { getOutputFormats, getChunksAffectedByImports } from './helpers'

type Payload = {
  configFilePath?: string,
  configLoadFile?: boolean,
  directory?: string,
  // ^ Either directory to initialize pundle from or an instance
  config?: Object,
  watchConfig?: Object,

  hmr?: boolean, // enabled by default
  lazy?: boolean,
  // Used for chunk/image loading and HMR
  publicPath: string,
  changedCallback?: (changed: Array<ImportResolved>) => void,
  generatedCallback?: (url: string, contents: string | Buffer) => void,
}
const PUNDLE_OPTIONS = ['configFilePath', 'configLoadFile', 'directory']

async function getPundleDevMiddleware(options: Payload) {
  invariant(typeof options.publicPath === 'string', 'options.publicPath must be a string')
  defaults(options, { hmr: true })

  const router = new Router()

  let { publicPath = '/' } = options
  if (publicPath.endsWith('/')) {
    publicPath = publicPath.slice(0, -1)
  }

  let configEntry = get(options, 'config.entry', []).slice()
  if (options.hmr) {
    configEntry = [require.resolve('./client/hmr-client')].concat(configEntry)
  }

  const pundle = await getPundle({
    ...pick(options, PUNDLE_OPTIONS),
    config: {
      ...get(options, 'config', {}),
      entry: configEntry,
      output: {
        formats: await getOutputFormats(pick(options, PUNDLE_OPTIONS), publicPath),
        rootDirectory: '/tmp',
      },
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

    function setToUrlContents(filePath: string, contents: string | Buffer) {
      urlToContents[filePath] = contents
      if (options.generatedCallback) {
        options.generatedCallback(filePath, contents)
      }
    }

    outputs.forEach(({ filePath, contents, sourceMap }) => {
      if (filePath) {
        setToUrlContents(filePath, contents)
        if (sourceMap && sourceMap.filePath) {
          setToUrlContents(sourceMap.filePath, sourceMap.contents)
        }
      }
    })
  }
  async function generateForHMR({ job }: { job: Job }) {
    if (!(filesChangedHMR.size > 0 && options.hmr && hmrConnectedClients.size > 0)) {
      return
    }

    function setToHMRUrlContents(filePath: string, contents: string | Buffer) {
      urlToHMRContents[filePath] = contents
      if (options.generatedCallback) {
        options.generatedCallback(filePath, contents)
      }
    }

    const transformedJob = await pundle.transformJob(job)
    const changed = Array.from(filesChangedHMR)
    filesChangedHMR.clear()

    const hmrId = Date.now()
    const hmrChunksByFormat = {}

    changed.forEach(fileImport => {
      if (fileImport.format !== 'js') return
      if (!hmrChunksByFormat[fileImport.format]) {
        hmrChunksByFormat[fileImport.format] = getChunk(fileImport.format, `hmr-${hmrId}`)
      }
      hmrChunksByFormat[fileImport.format].imports.push(fileImport)
    })
    const hmrChunks: $FlowFixMe = Object.values(hmrChunksByFormat)
    const { outputs } = await pundle.generate(transformedJob, hmrChunks)
    outputs.forEach(({ filePath, contents, sourceMap }) => {
      if (filePath) {
        setToHMRUrlContents(filePath, contents)
        if (sourceMap && sourceMap.filePath) {
          setToHMRUrlContents(sourceMap.filePath, sourceMap.contents)
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
    console.log(
      `  [HMR] Writing ${outputs.length} chunk${outputs.length > 1 ? 's' : ''} to ${hmrConnectedClients.size} clients`,
    )

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
    ...(options.watchConfig || {}),
    pundle,
    async generate({ changed }) {
      changed.forEach(fileImport => {
        filesChanged.add(fileImport)
      })
      generated = null
      await generateForHMR({ job })
      if (options.changedCallback) {
        options.changedCallback(changed)
      }
    },
    tick({ newFile }) {
      if (options.hmr && !firstTime) {
        filesChangedHMR.add({ format: newFile.format, filePath: newFile.filePath, meta: newFile.meta })
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
      let { pathname } = url.parse(req.url)

      if (!pathname) return

      if (pathname.startsWith('/')) {
        pathname = pathname.slice(1)
      }

      if (pathname.endsWith('.pundle.hmr')) {
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

      if (pathname.endsWith('/') || pathname === '') {
        pathname = `${pathname}index`
      }

      function respondWith(output, givenPathname) {
        const mimeType = mime.getType(path.extname(givenPathname) || '.html') || 'application/octet-stream'
        res.set('content-type', mimeType)
        res.end(output)
      }

      const hmrContents = urlToHMRContents[pathname]
      if (hmrContents) {
        respondWith(hmrContents, pathname)
        return
      }

      await queue.waitTillIdle()
      await generateJob({ job })

      const contents = urlToContents[pathname] || urlToContents[`${pathname}.html`]
      if (contents) {
        respondWith(contents, pathname)
        return
      }
      next()
    }),
  )

  return router
}

module.exports = { getPundleDevMiddleware, getChunksAffectedByImports }
