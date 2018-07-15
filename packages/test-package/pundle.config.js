const path = require('path')
const presetDefault = require('pundle-preset-default')

module.exports = {
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
  },
}
