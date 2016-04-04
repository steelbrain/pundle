#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
let exitCode = 0
pundle.onCaughtError(function(e) {
  console.error(e && e.stack || e)
  exitCode = 1
})
Promise.resolve().then(function() {
  return pundle.compile()
}).then(function(result) {
  if (result) {
    console.log(result.contents)
    if (pundle.config.sourceMaps) {
      console.error(JSON.stringify(result.sourceMap))
    }
  }
  process.exit(exitCode)
})
