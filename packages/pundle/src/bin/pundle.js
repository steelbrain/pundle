#!/usr/bin/env node

/* @flow */

require('process-bootstrap')('pundle', 'PUNDLE')

const Pundle = require('../')

const pundle = new Pundle({
  entry: './index.js',
  rootDirectory: process.cwd()
})

console.profile('compile')
pundle.compile().then(function() {
  console.profileEnd('compile')
})
