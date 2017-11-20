import hello from './hello'

import('./hello').then(function(yeah) {
  console.log('yeah', yeah)
})

console.log('hello', hello)
console.log('hello world! How are you?! Khikhikhi')

console.log(require('./hello'))

console.log(require.resolve('./hello'))
console.log('NODE_ENV', process.env.NODE_ENV, Buffer.from(['hello']))
console.log('cleared', clearImmediate(null))
console.log('something', require('./something.json'))

const img = document.createElement('img')
img.src = require('./images/google.png')

document.body.appendChild(img)
console.log('yah')
console.log('wow', require('./wow.ts'))
console.log('in main', require('color'))
console.log('css', require('./css.css'))
