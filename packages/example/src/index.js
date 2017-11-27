// @flow

import path from 'path'
import getPundle from 'pundle-core'

getPundle({
  rootDirectory: path.join(__dirname, '..', 'root'),
})
  .then(function(pundle) {
    // return pundle.build().then(function(built) {
    //   return pundle.write(built)
    // })
    return pundle.watch({
      tick() {
        console.log('lifecycle tick')
      },
      ready() {
        console.log('lifecycle ready')
      },
      compiled() {
        console.log('lifecycle compiled')
      },
    })
  })
  .catch(console.error)
