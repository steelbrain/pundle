#!/usr/bin/env node
'use strict'

const showSourceMap = process.argv.indexOf('--source-map') !== -1
const sourceMapToComment = require('source-map-to-comment')
const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
Promise.resolve().then(function() {
  return pundle.get()
}).then(function(compilation) {
  return compilation.compile().then(function() {
    const generated = compilation.generate()
    process.stdout.write(generated)
    process.stdout.write('\n')
    if (showSourceMap) {
      const sourceMap = compilation.generateSourceMap()
      process.stdout.write(sourceMapToComment(sourceMap))
      process.stdout.write('\n')
    }
  })
}).catch(function(error) {
  console.error(error)
  process.exit(1)
})
