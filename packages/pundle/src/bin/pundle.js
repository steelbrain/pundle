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
  process.stdout.write('\n\n\n\n\n\n')
  process.stdout.write(JSON.stringify(pundle.generate(), null, 2))
}).catch(function(e) {
  console.error('[Pundle] Compilation Error', e)
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
