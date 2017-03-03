/* @flow */

import send from 'send'
import unique from 'lodash.uniq'
import express from 'express'
import arrayDiff from 'lodash.difference'
import ConfigFile from 'sb-config-file'
import promiseDefer from 'promise.defer'
import { CompositeDisposable } from 'sb-event-kit'
import { getRelativeFilePath, createWatcher, MessageIssue } from 'pundle-api'
import type Pundle from 'pundle/src'
import type { File } from 'pundle-api/types'

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
    if (Helpers.isCompilationRegistered(pundle.context)) {
      throw new Error('Cannot create two middlewares on one Pundle instance')
    }

    this.state = {
      files: [],
      queue: Promise.resolve(),
      booted: false,
      modified: false,
      activated: false,
      generated: { contents: '', sourceMap: {}, filePaths: [] },
    }
    this.pundle = pundle
    this.config = Helpers.fillConfig(config)
    this.connections = new Set()
    this.filesChanged = new Set()
    this.subscriptions = new CompositeDisposable()

    Helpers.registerCompilation(pundle.context, this.config)
  }
  async activate() {
    const app = express()
    const oldFiles: Map<string, File> = new Map()
    const bootPromise = promiseDefer()
    const rootDirectory = this.pundle.config.rootDirectory

    this.cache = await ConfigFile.get(await Helpers.getCacheFilePath(rootDirectory), {
      directory: rootDirectory,
      files: [],
    }, {
      prettyPrint: false,
      createIfNonExistent: true,
    })
    if (this.config.useCache) {
      this.pundle.context.setUniqueID(await this.cache.get('uniqueId'))
      const oldFilesArray = await this.cache.get('files')
      oldFilesArray.forEach(function(file) {
        oldFiles.set(file.filePath, file)
      })
    }
    if (oldFiles.size) {
      this.report(`Restoring ${oldFiles.size} files from cache`)
    }
    this.enqueue(() => bootPromise.promise)

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
        if (req.url !== '/index.html' && req.baseUrl !== '/index.html') {
          req.baseUrl = req.url = '/index.html'
          send(req, req.baseUrl, { root: this.config.rootDirectory, index: 'index.html' }).on('error', next).on('directory', next).pipe(res)
        } else next()
      })
    }
    await this.attachComponents(bootPromise)

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
    const watcherSubscription = await this.pundle.watch({}, oldFiles)
    this.enqueue(() => watcherSubscription.queue)
    this.subscriptions.add(watcherSubscription)
  }
  async attachComponents(bootPromise: Object): Promise<void> {
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
          if (!error && filePath !== Helpers.browserFile && this.state.booted) {
            this.filesChanged.add(filePath)
          }
        },
        ready: (_, initalStatus) => {
          this.report(`Server initialized ${initalStatus ? 'successfully' : 'with errors'}`)
        },
        compile: async (_: Object, files: Array<File>) => {
          bootPromise.resolve()
          this.state.files = files
          this.state.booted = true
          this.state.modified = true
          if (this.connections.size && this.filesChanged.size) {
            await this.generateForHMR()
          }
        },
      }),
    ]))
  }
  async generate() {
    this.state.modified = false
    this.state.generated = await this.pundle.generate(this.state.files, {
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
    const newFiles = arrayDiff(generated.filePaths, this.state.generated.filePaths)
    this.writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filePaths, newFiles })
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
      Helpers.unregisterCompilation(this.pundle.context)
      this.cache.setSync('files', this.state.files)
      this.cache.setSync('uniqueId', this.pundle.context.getUniqueID())
    }
    this.subscriptions.dispose()
  }
}

module.exports = Server
