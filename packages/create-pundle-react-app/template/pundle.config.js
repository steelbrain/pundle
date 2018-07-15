const path = require('path')
const presetDefault = require('pundle-preset-default')

const pundleConfig = {
  cache: {
    enabled: true,
  },
  entry: ['./src', './index.html'],
  components: presetDefault({
    target: process.env.PUNDLE_TARGET || 'node',
    transform: {
      babel: 6,
    },
  }),
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
    formats: {
      static: 'assets/[id][ext]',
      html: '[name].[format]',
      '*': 'assets/[id].[format]',
    },
  },
}

module.exports = pundleConfig
