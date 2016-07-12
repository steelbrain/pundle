#!/usr/bin/env node

/* @flow */

import Pundle from '../'

const pundle = new Pundle({
  entry: './index.js',
  rootDirectory: process.cwd()
})

pundle.compile()
