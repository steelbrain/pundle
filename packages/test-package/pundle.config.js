import path from 'path'

import cssnano from 'cssnano'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerJS from 'pundle-transformer-js'
import transformerCSS from 'pundle-transformer-css'
import transformerCoffee from 'pundle-transformer-coffee'
import transformerSass from 'pundle-transformer-sass'
import transformerLess from 'pundle-transformer-less'
import transformerCSON from 'pundle-transformer-cson'
import transformerJSON from 'pundle-transformer-json'
import transformerJSON5 from 'pundle-transformer-json5'
import transformerBabel from 'pundle-transformer-babel'
import transformerStatic from 'pundle-transformer-static'
import transformerStylus from 'pundle-transformer-stylus'
import transformerPostcss from 'pundle-transformer-postcss'
import transformerTypescript from 'pundle-transformer-typescript'
import chunkGeneratorJs from 'pundle-chunk-generator-js'
import chunkGeneratorHtml from 'pundle-chunk-generator-html'
import chunkGeneratorStatic from 'pundle-chunk-generator-static'
import chunkTransformerJS from 'pundle-chunk-transformer-js'
import browserAliases from 'pundle-resolver-aliases-browser'

export default {
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
    chunkTransformerJS(),
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
