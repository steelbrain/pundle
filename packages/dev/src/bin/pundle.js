#!/usr/bin/env node

const Server = require('../')
const server = new Server({
  pundle: {
    hmr: true,
    entry: 'index.js',
    rootDirectory: process.cwd(),
  },
  watcher: {
    onError(error) {
      console.error(error)
    },
  },
  middleware: {
    sourceMap: true,
    publicPath: '/',
    publicBundlePath: '/bundle.js',
  },
  server: {
    port: 3002,
  },
})

server.listen(function() {
  console.log('Server running on http://localhost:3002/')
})
