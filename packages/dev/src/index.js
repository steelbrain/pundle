/* @flow */

import send from 'send'
import unique from 'lodash.uniq'
import express from 'express'
import arrayDiff from 'lodash.difference'
import ConfigFile from 'sb-config-file'
import { CompositeDisposable } from 'sb-event-kit'
import { getRelativeFilePath, createWatcher, MessageIssue } from 'pundle-api'
import type Pundle from 'pundle/src'
import type { File, FileChunk } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { ServerConfig, ServerState, ServerConfigInput } from '../types'

const WssServer = Helpers.getWssServer()
const debugTick = require('debug')('PUNDLE:DEV:TICK')
const cliReporter: Object = require('pundle-reporter-cli')

class Server {
  state: ServerState;
  cache: ConfigFile;
  config: ServerConfig;
  pundle: Pundle;
  connections: Set<Object>;
  filesChanged: Set<string>;
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
      files: [],
      chunks: [],
      queue: Promise.resolve(),
      modified: false,
      generated: new Map(),
    }
    this.pundle = pundle
    this.config = Helpers.fillConfig(config)
    this.connections = new Set()
    this.filesChanged = new Set()
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

    // TODO: Bundle paths
    app.get(this.config.bundlePath, (req, res) => {
      this.generateIfNecessary().then(() => res.set('content-type', 'application/javascript').end(this.state.generated.contents))
    })
    if (this.config.sourceMap && this.config.sourceMapPath !== 'inline') {
      app.get(this.config.sourceMapPath, (req, res) => {
        this.generateIfNecessary().then(() => res.set('content-type', 'application/javascript').end(JSON.stringify(this.state.generated.sourceMap)))
      })
    }
    app.use('/', express.static(this.config.rootDirectory))
    if (this.config.redirectNotFoundToIndex) {
      app.use((req, res, next) => {
        if (req.url !== '/' && req.baseUrl !== '/') {
          req.baseUrl = req.url = '/'
          // TODO: Replace this with a route caller, because we are gonna be transforming index.html
          send(req, req.baseUrl, { root: this.config.rootDirectory, index: 'index.html' }).on('error', next).on('directory', next).pipe(res)
        } else next()
      })
    }
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
  async attachComponents(): Promise<void> {
    let booted = false
    this.subscriptions.add(await this.pundle.loadComponents([
      [cliReporter, {
        log: (text, error) => {
          if (this.config.hmrReports && error.severity && error.severity !== 'info') {
            this.writeToConnections({ type: 'report', text, severity: error.severity || 'error' })
          }
        },
      }],
      createWatcher({
        tick: (_: Object, filePath: string, error: ?Error) => {
          debugTick(`${filePath} :: ${error ? error.message : 'null'}`)
          if (!error && filePath !== Helpers.browserFile && booted) {
            this.filesChanged.add(filePath)
          }
        },
        ready: () => {
          booted = true
          this.report('Server initialized successfully')
        },
        compile: async (_: Object, chunks: Array<FileChunk>, files: Map<string, File>) => {
          console.log('wtf', chunks, files)
          // bootPromise.resolve()
          // this.state.files = files
          // this.state.booted = true
          // this.state.modified = true
          // if (this.connections.size && this.filesChanged.size) {
          //   await this.generateForHMR()
          // }
        },
      }),
    ]))
  }
  async generate() {
    this.state.modified = false
    this.state.generated = await this.pundle.generate(this.state.chunks, {
      wrapper: 'hmr',
      sourceMap: this.config.sourceMap,
      sourceMapPath: this.config.sourceMapPath,
      sourceNamespace: 'app',
    })
  }
  async generateForHMR() {
    const rootDirectory = this.pundle.config.rootDirectory
    const changedFilePaths = unique(Array.from(this.filesChanged))

    const relativeChangedFilePaths = changedFilePaths.map(i => getRelativeFilePath(i, rootDirectory))
    this.report(`Sending HMR to ${this.connections.size} clients of [ ${
      relativeChangedFilePaths.length > 4 ? `${relativeChangedFilePaths.length} files` : relativeChangedFilePaths.join(', ')
    } ]`)
    this.writeToConnections({ type: 'report-clear' })
    const generated = await this.pundle.generate(this.state.files.filter(entry => ~changedFilePaths.indexOf(entry.filePath)), {
      entry: [],
      wrapper: 'none',
      sourceMap: this.config.sourceMap,
      sourceMapPath: 'inline',
      sourceNamespace: 'app',
      sourceMapNamespace: `hmr-${Date.now()}`,
    })
    // TODO: Uncomment this
    // const newFiles = arrayDiff(generated.filePaths, this.state.generated.filePaths)
    // this.writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filePaths, newFiles })
    this.writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filePaths })
    this.filesChanged.clear()
  }
  async generateIfNecessary() {
    this.enqueue(() => this.state.modified && this.generate())
    await this.state.queue
  }
  report(contents: string, severity: 'info' | 'error' | 'warning' = 'info') {
    this.pundle.context.report(new MessageIssue(contents, severity))
  }
  enqueue(callback: Function): void {
    this.state.queue = this.state.queue.then(() => callback()).catch(e => this.pundle.context.report(e))
  }
  writeToConnections(contents: Object): void {
    const stringifiedContents = JSON.stringify(contents)
    this.connections.forEach(connection => connection.send(stringifiedContents))
  }
  dispose() {
    if (!this.subscriptions.disposed) {
      Helpers.unregisterPundle(this.pundle)
      this.cache.setSync('files', this.state.files)
      this.cache.setSync('state', this.pundle.context.serialize())
    }
    this.subscriptions.dispose()
  }
}

module.exports = Server
