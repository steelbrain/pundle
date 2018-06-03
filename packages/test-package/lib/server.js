// @flow

import path from 'path'
import express from 'express'
import getPundleDevMiddleware from 'pundle-dev-middleware'

async function main() {
  const app = express()
  app.use(await getPundleDevMiddleware({ directory: path.dirname(__dirname) }))
  await new Promise(function(resolve) {
    app.listen(3000, resolve)
  })
  console.log('Listening on http://localhost:3000')
}
main().catch(console.error)
