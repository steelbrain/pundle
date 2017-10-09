// @flow

import path from 'path'
import getPundle from 'pundle-core'

getPundle({
  rootDirectory: path.join(__dirname, '..', 'root'),
})
  .then(function(pundle) {
    return pundle.build()
  })
  .catch(console.error)
