import test2 from './test2'

const test = require('./test')

console.log('hi!', test2, test)

import('./test3').then(function(val) {
  console.log('val', val)
})

console.log('react', require('react'), 'react-dom', require('react-dom'))
