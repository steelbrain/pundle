const path = require('path')

const cssnano = require('cssnano')
const cliReporter = require('pundle-reporter-cli')
const resolverDefault = require('pundle-resolver-default')
const transformerJS = require('pundle-transformer-js')
const transformerCSS = require('pundle-transformer-css')
const transformerCoffee = require('pundle-transformer-coffee')
const transformerSass = require('pundle-transformer-sass')
const transformerLess = require('pundle-transformer-less')
const transformerCSON = require('pundle-transformer-cson')
const transformerJSON = require('pundle-transformer-json')
const transformerJSON5 = require('pundle-transformer-json5')
const transformerBabel = require('pundle-transformer-babel')
const transformerStatic = require('pundle-transformer-static')
const transformerStylus = require('pundle-transformer-stylus')
const transformerPostcss = require('pundle-transformer-postcss')
const transformerTypescript = require('pundle-transformer-typescript')
const chunkGeneratorJs = require('pundle-chunk-generator-js')
const chunkGeneratorHtml = require('pundle-chunk-generator-html')
const chunkGeneratorStatic = require('pundle-chunk-generator-static')
const chunkTransformerJSUglify = require('pundle-chunk-transformer-js-uglify')
const browserAliases = require('pundle-resolver-aliases-browser')
const jobTransformerJSCommon = require('pundle-job-transformer-js-common')

module.exports = {
  cache: {
    enabled: true,
  },
  entry: ['./src', './index.html'],
  components: [
    cliReporter(),
    resolverDefault({
      formats: {
        js: ['.js', '.mjs', '.json', '.ts', '.tsx', '.json5', '.cson', '.coffee'],
        html: ['.html'],
        css: ['.css', '.less', '.scss', '.styl'],
        static: ['.png'],
      },
      aliases: browserAliases,
    }),
    transformerCSON(),
    transformerCSS({
      extensions: ['.css', '.less', '.scss', '.styl'],
    }),
    transformerCoffee(),
    transformerJSON(),
    transformerJSON5(),
    transformerBabel(),
    transformerJS({
      transformCore: true,
    }),
    transformerLess(),
    transformerSass(),
    transformerStatic({
      extensionsOrMimes: ['.png'],
    }),
    transformerStylus(),
    transformerPostcss({
      plugins: [cssnano({ preset: 'default' })],
    }),
    transformerTypescript(),
    chunkGeneratorJs(),
    chunkGeneratorHtml(),
    chunkGeneratorStatic({ formats: ['css'] }),
    chunkTransformerJSUglify(),
    jobTransformerJSCommon(),
  ],
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
