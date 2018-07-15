const path = require('path')
const presetDefault = require('pundle-preset-default')

const pundleConfig = {
  entry: ['./src', './index.html'],
  components: presetDefault(),
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
  },
}

module.exports = pundleConfig
