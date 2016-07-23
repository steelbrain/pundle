#!/usr/bin/env node

/* @flow */

require('process-bootstrap')('pundle', 'PUNDLE')

const Pundle = require('../')

const pundle = new Pundle({
  entry: './index.js',
  pathType: 'filePath',
  rootDirectory: process.cwd(),
})

// ------ Compile ------
console.profile('compile')
pundle.compile().then(function() {
  console.profileEnd('compile')
})

// ------ Watch ------
// pundle.watch({
//   error(error) {
//     console.log('error received', error)
//   },
//   ready() {
//     console.log('ready')
//   },
//   generate() {
//     console.log('should generate')
//   },
// })
