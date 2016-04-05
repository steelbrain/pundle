#!/usr/bin/env node
'use strict'

const showSourceMap = process.argv.indexOf('--source-map') !== -1
const sourceMapToComment = require('source-map-to-comment')
const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
Promise.resolve().then(function() {
  return pundle.compile(showSourceMap)
}).then(function(result) {
  process.stdout.write(result.contents)
  process.stdout.write('\n')
  if (showSourceMap) {
    process.stdout.write(sourceMapToComment(result.sourceMap))
    process.stdout.write('\n')
  }
}).catch(function(error) {
  console.error(error)
  process.exit(1)
})
