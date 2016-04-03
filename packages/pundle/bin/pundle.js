#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
Promise.resolve().then(function() {
  return pundle.compile()
}).then(function(result) {
  console.log(result)
}).catch(function(e) {
  console.log(e)
})
