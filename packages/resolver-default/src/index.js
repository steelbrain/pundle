/* @flow */

import { promisify } from 'sb-promisify'
import { createResolver } from 'pundle-api'

const resolve = promisify(require('resolve'))

/*
  NOTE for browser field implementation
  Use the manifest of the requester to resolve outgoing references
  Use the manifest of the requestee to resolve incoming references
*/

// eslint-disable-next-line no-unused-vars
export default createResolver(async function(request: string, fromFile: string, config: Object, pundle: Object) {

}, {})
