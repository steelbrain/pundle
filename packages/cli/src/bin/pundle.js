#!/usr/bin/env node
'use strict'

const Server = require('../')
const server = new Server({
  pundle: {
    entry: 'index.js',
    rootDirectory: process.cwd()
  },
  watcher: {
    onError(error) {
      console.log(error)
    }
  },
  middleware: {
    sourceMap: true,
    publicPath: '/',
    publicBundlePath: '/bundle.js'
  },
  server: {
    port: 3002
  }
})

server.listen(function() {
  console.log('Server running on http://localhost:3002/')
})
