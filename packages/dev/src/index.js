/* @flow */

import FS from 'sb-fs'
import Path from 'path'
import unique from 'lodash.uniq'
import express from 'express'
import promiseDefer from 'promise.defer'
import ConfigFile from 'sb-config-file'
import { CompositeDisposable } from 'sb-event-kit'
import { getRelativeFilePath, createWatcher, MessageIssue } from 'pundle-api'
import type Pundle from 'pundle/src'
import type { File, FileChunk, GeneratorResult } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { ServerConfig, ServerState, ServerConfigInput } from '../types'

const WssServer = Helpers.getWssServer()
const cliReporter: Object = require('pundle-reporter-cli')

class Server {
  state: ServerState;
  cache: ConfigFile;
  config: ServerConfig;
  pundle: Pundle;
  connections: Set<Object>;
  subscriptions: CompositeDisposable;
  constructor(pundle: Pundle, config: ServerConfigInput) {
    if (Helpers.isPundleRegistered(pundle)) {
      throw new Error('Cannot create two middlewares on one Pundle instance')
    }

    // TODO:
    // store latest chunks in state
    // and compile the specific chunk when get request is recieved
    // use the chunk labels and a regexp in express path to generate at will
    // only hmr when connected clients

    this.state = {
      queue: Promise.resolve(),
      files: new Map(),
      chunks: [],
      changed: new Map(),
    }
    this.pundle = pundle
    this.config = Helpers.fillConfig(config)
    this.connections = new Set()
    this.subscriptions = new CompositeDisposable()

    Helpers.registerPundle(pundle, this.config)
  }
  async activate() {
    const app = express()
    const oldFiles: Map<string, File> = new Map()
    const rootDirectory = this.pundle.config.rootDirectory

    this.cache = await ConfigFile.get(await Helpers.getCacheFilePath(rootDirectory), {
      directory: rootDirectory,
      files: [],
    }, {
      prettyPrint: false,
      createIfNonExistent: true,
    })
    if (this.config.useCache) {
      this.pundle.context.unserialize(await this.cache.get('state'))
      const oldFilesArray = await this.cache.get('files')
      oldFilesArray.forEach(function(file) {
        oldFiles.set(file.filePath, file)
      })
    }
    if (oldFiles.size) {
      this.report(`Restoring ${oldFiles.size} files from cache`)
    }

    await this.attachRoutes(app)
    await this.attachComponents()

    const server = app.listen(this.config.port)
    if (this.config.hmrPath) {
      const wss = new WssServer({ server, path: this.config.hmrPath })
      wss.on('connection', (connection) => {
        connection.on('close', () => this.connections.delete(connection))
        this.connections.add(connection)
      })
    }
    this.subscriptions.add(function() {
      server.close()
    })
    this.subscriptions.add(await this.pundle.watch(this.config.useCache, oldFiles))
  }
  attachRoutes(app: Object): void {
    const bundlePathExt = Path.extname(this.config.bundlePath)
    app.get([this.config.bundlePath, `${this.config.bundlePath.slice(0, -1 * bundlePathExt.length)}*`], (req, res, next) => {
      this.generateChunk(req.url).then(function(chunk) {
        if (!chunk) {
          next()
          return
        }
        if (req.url.endsWith('.js.map')) {
          res.set('content-type', 'application/json')
          res.end(JSON.stringify(chunk.sourceMap))
        } else {
          res.set('content-type', 'application/javascript')
          res.end(chunk.contents)
        }
      }).catch(next)
    })

    const serveFilledHtml = (req, res, next) => {
      this.state.queue.then(() => FS.readFile(Path.join(this.config.rootDirectory, 'index.html'), 'utf8')).then(contents => {
        res.set('content-type', 'text/html')
        res.end(this.pundle.fill(contents, this.state.chunks, {
          publicRoot: Path.dirname(this.config.bundlePath),
          bundlePath: Path.basename(this.config.bundlePath),
        }))
      }, function(error) {
        if (error.code === 'ENOENT') {
          next()
        } else next(error)
      })
    }
    app.get('/', serveFilledHtml)

    app.use('/', express.static(this.config.rootDirectory))
    if (this.config.redirectNotFoundToIndex) {
      app.use(serveFilledHtml)
    }
  }
  async attachComponents(): Promise<void> {
    let booted = false
    const boot = promiseDefer()
    this.enqueue(() => boot.promise)
    this.subscriptions.add(await this.pundle.loadComponents([
      [cliReporter, {
        log: (text, error) => {
          if (this.config.hmrReports && error.severity && error.severity !== 'info') {
            this.writeToConnections({ type: 'report', text, severity: error.severity || 'error' })
          }
        },
      }],
      createWatcher({
        tick: (_: Object, file: File) => {
          if (booted && file.filePath !== Helpers.browserFile) {
            this.state.changed.set(file.filePath, file)
          }
        },
        ready: () => {
          this.report('Server initialized successfully')
        },
        compile: async (_: Object, chunks: Array<FileChunk>, files: Map<string, File>) => {
          this.state.files = files
          this.state.chunks = chunks
          if (this.connections.size && this.state.changed.size) {
            await this.generateForHMR()
          }
          boot.resolve()
          booted = true
        },
      }),
    ]))
  }
  // NOTE: Stuff below this line is called at will and not excuted on activate or whatever
  async generate(chunk: FileChunk, config: Object = {}): Promise<GeneratorResult> {
    this.state.changed.clear()
    const generated = await this.pundle.generate([chunk], {
      wrapper: 'hmr',
      bundlePath: Path.basename(this.config.bundlePath),
      publicRoot: Path.dirname(this.config.bundlePath),
      sourceMap: this.config.sourceMap,
      sourceMapPath: this.config.sourceMapPath,
      sourceNamespace: 'app',
      ...config,
    })
    return generated[0]
  }
  async generateForHMR() {
    const rootDirectory = this.pundle.config.rootDirectory

    const changedFilePaths = unique(Array.from(this.state.changed.keys()))
    const relativeChangedFilePaths = changedFilePaths.map(i => getRelativeFilePath(i, rootDirectory))
    this.report(`Sending HMR to ${this.connections.size} clients of [ ${
      relativeChangedFilePaths.length > 4 ? `${relativeChangedFilePaths.length} files` : relativeChangedFilePaths.join(', ')
    } ]`)
    this.writeToConnections({ type: 'report-clear' })

    const label = `hmr-${Date.now()}`
    const chunk = this.pundle.context.getChunk(null, label, null, new Map(this.state.changed))
    const generated = await this.generate(chunk, {
      sourceMapPath: 'inline',
      sourceMapNamespace: `hmr-${Date.now()}`,
    })
    this.writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filesGenerated })
  }
  async generateChunk(url: string): Promise<?GeneratorResult> {
    await this.state.queue

    const chunkId = Helpers.getChunkId(url, this.config.bundlePath)
    const chunk = this.state.chunks.find(entry => entry.id.toString() === chunkId || entry.label === chunkId)
    if (!chunk) {
      return null
    }

    let generated
    this.enqueue(() => this.generate(chunk).then(result => {
      generated = result
    }))
    await this.state.queue
    return generated
  }
  report(contents: string, severity: 'info' | 'error' | 'warning' = 'info') {
    this.pundle.context.report(new MessageIssue(contents, severity))
  }
  enqueue(callback: Function): void {
    this.state.queue = this.state.queue.then(callback).catch(e => this.pundle.context.report(e))
  }
  writeToConnections(contents: Object): void {
    const stringifiedContents = JSON.stringify(contents)
    this.connections.forEach(connection => connection.send(stringifiedContents))
  }
  dispose() {
    if (!this.subscriptions.disposed) {
      Helpers.unregisterPundle(this.pundle)
      this.cache.setSync('files', Array.from(this.state.files.values()))
      this.cache.setSync('state', this.pundle.context.serialize())
    }
    this.subscriptions.dispose()
  }
}

module.exports = Server
