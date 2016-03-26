#!/usr/bin/env node
'use strict'

const Pundle = require('../')
const pundle = new Pundle({ rootDirectory: process.cwd(), mainFile: 'index.js' })
pundle.compile().catch(e => console.log(e && e.stack || e))
