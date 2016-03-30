#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
pundle.compile()
  .then(result => console.log(result))
  .catch(e => console.log(e && e.stack || e))
