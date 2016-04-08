'use strict'

/* @flow */

export type Middleware$Options = {
  publicPath: string,
  publicBundlePath: string
  // ^ Public path of the bundled
  // Example Configuration:
  // publicPath: '/_'
  // publicBundlePath: '/_/scripts/bundle.js'
  //
  // Visiting /_/scripts/bundle.js will now trigger bundling
}
