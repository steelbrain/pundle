const path = require('path')
const presetDefault = require('pundle-preset-default')

module.exports = {
  cache: {
    enabled: true,
  },
  entry: ['./src', './index.html'],
  components: presetDefault({
    transform: {
      cson: true,
      css: true,
      coffee: true,
      json: true,
      json5: true,
      babel: 7,
      js: true,
      less: true,
      sass: true,
      stylus: true,
      postcss: true,
      typescript: true,
    },
  }),
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
    formats: {
      '*.map': 'assets/[id].[format]',
      static: 'assets/[id][ext]',
      '*': 'assets/[id].[format]',
      html: '[name].[format]',
    },
  },
}
