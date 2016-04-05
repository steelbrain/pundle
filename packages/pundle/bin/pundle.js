#!/usr/bin/env node
'use strict'

const showSourceMap = process.argv.indexOf('--source-map') !== -1
const sourceMapToComment = require('source-map-to-comment')
const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
Promise.resolve().then(function() {
  return pundle.compile(showSourceMap)
}).then(function(result) {
  console.log(result.contents)
  if (showSourceMap) {
    console.log(sourceMapToComment(result.sourceMap))
  }
}).catch(function(error) {
  console.error(error)
  process.exitCode = 1
})
