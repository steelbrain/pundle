#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), entry: 'index.js' })
pundle.compile()
  .then(() => pundle.generate())
  .catch(e => console.log(e && e.stack || e))
