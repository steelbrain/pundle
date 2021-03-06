import test2 from './test2'

const test = require('./test')

console.log('imported val test2', test2)
console.log('hi!', test)

import('./test3').then(function(val) {
  console.log('Async chunk loaded val', val)
})

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

console.log('test less', require('../styles/test.less'))
console.log('test sass', require('../styles/test.scss'))
console.log('test stylus', require('../styles/test.styl'))
console.log('indexCss', require('../styles/index.module.css'))
console.log('nonModuleCss', require('../styles/non-module.css'))
console.log('cson', require('./test.cson'))
console.log('json', require('./haha'))
console.log('json5', require('./test.json5'))
console.log('typescript', require('./typescript.ts'))
console.log('coffeescript', require('./test.coffee'))
console.log('toml', require('./test.toml'))
console.log('yaml', require('./test.yaml'))
console.log('graphql', require('./test.gql'))
console.log('path', require('path'))

if (process.browser) {
  console.log('big photo', appendPhotoToBody(require('../photos/big-photo.png')))
  console.log('photos inline', appendPhotoToBody(require('../photos/small-photo.png')))
}

if (module.hot) {
  module.hot.accept()
}

module.exports = { exported: 'magic' }
