// import test2 from './test2'

const test = require('./test')

// console.log('hi!', test2)
console.log('hi!', test)

// import('./test3').then(function(val) {
//   console.log('val', val)
// })

function appendPhotoToBody(src) {
  const img = document.createElement('img')
  img.src = src
  if (document.body) {
    document.body.appendChild(img)
  } else {
    console.warn('document.body is null')
  }
  return src
}

console.log('react', require('react'), 'react-dom', require('react-dom'), setImmediate)

console.log(process.env.NODE_ENV === 'development' ? 'development' : 'production')

console.log('indexCss', require('../styles/index.module.css'))
console.log('nonModuleCss', require('../styles/non-module.css'))
console.log('json', require('./haha'))
console.log('typescript', require('./typescript.ts'))

console.log('photos inline', appendPhotoToBody(require('../photos/small-photo.png')))
console.log('big photo', appendPhotoToBody(require('../photos/big-photo.png')))
