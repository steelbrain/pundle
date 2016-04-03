#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
pundle.onCaughtError(function(e) {
  console.error(e && e.stack || e)
})
Promise.resolve().then(function() {
  return pundle.compile()
}).then(function(result) {
  if (result) {
    console.log(result)
  }
})
