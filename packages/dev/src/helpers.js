/* @flow */

import type { ServerConfig } from './types'

// From: goo.gl/fZA6BF
export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

export function fillConfig(givenConfig: Object): ServerConfig {
  const config = Object.assign({}, givenConfig)
  config.hmr = Boolean(config.hmr)
  if (config.port) {
    if (typeof config.port !== 'number') {
      throw new Error('config.port must be a number')
    }
  } else {
    config.port = getRandomNumber(8000, 15000)
  }
  if (config.hmrPath) {
    if (typeof config.hmrPath !== 'string') {
      throw new Error('config.hmrPath must be a string')
    }
  } else {
    config.hmrPath = '/_/bundle_hmr'
  }
  if (config.bundlePath) {
    if (typeof config.bundlePath !== 'string') {
      throw new Error('config.bundlePath must be a string')
    }
  } else {
    config.bundlePath = '/_/bundle.js'
  }
  if (config.sourceRoot) {
    if (typeof config.sourceRoot !== 'string') {
      throw new Error('config.sourceRoot must be null or string')
    }
  }
  if (config.sourceMapPath) {
    if (typeof config.sourceMapPath !== 'string') {
      throw new Error('config.sourceMapPath must be a string')
    }
  } else {
    config.sourceMapPath = '/_/bundle.js.map'
  }
  if (config.ready) {
    if (typeof config.ready !== 'function') {
      throw new Error('config.ready must be a function')
    }
  } else {
    config.ready = function() { }
  }
  if (config.generated) {
    if (typeof config.generated !== 'function') {
      throw new Error('config.generated must be a function')
    }
  } else {
    config.generated = function() { }
  }
  if (typeof config.error !== 'function') {
    throw new Error('config.error must be a function')
  }
  return config
}
