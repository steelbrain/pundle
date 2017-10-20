import hello from './hello'

import('./hello').then(function(yeah) {
  console.log(yeah.world)
})

console.log('hello', hello)
console.log('hello world! How are you?! Khikhikhi')

console.log(require('./hello'))

console.log(require.resolve('./hello'))
console.log('NODE_ENV', process.env.NODE_ENV)
