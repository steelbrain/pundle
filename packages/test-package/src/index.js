// import test2 from './test2'

const test = require('./test')
const indexCss = require('../styles/index.css')

// console.log('hi!', test2)
console.log('hi!', test)

// import('./test3').then(function(val) {
//   console.log('val', val)
// })

console.log('react', require('react'), 'react-dom', require('react-dom'), setImmediate)

console.log(process.env.NODE_ENV === 'development' ? 'development' : 'production')

console.log('indexCss', indexCss)
