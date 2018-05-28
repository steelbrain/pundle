import path from 'path'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerJS from 'pundle-transformer-js'
import transformerCSS from 'pundle-transformer-css'
import transformerJSON from 'pundle-transformer-json'
import transformerBabel from 'pundle-transformer-babel'
import transformerStatic from 'pundle-transformer-static'
import chunkGeneratorJs from 'pundle-chunk-generator-js'
import chunkGeneratorHtml from 'pundle-chunk-generator-html'
import chunkGeneratorStatic from 'pundle-chunk-generator-static'
import browserAliases from 'pundle-resolver-aliases-browser'

export default {
  entry: ['./src', './index.html'],
  components: [
    cliReporter(),
    resolverDefault({
      formats: {
        js: ['.js', '.mjs', '.json'],
        html: ['.html'],
        css: ['.css'],
        static: ['.png'],
      },
      aliases: browserAliases,
    }),
    transformerJSON(),
    transformerBabel(),
    transformerJS({
      transformCore: true,
    }),
    transformerCSS(),
    transformerStatic({
      extensionsOrMimes: ['.png'],
    }),
    chunkGeneratorJs(),
    chunkGeneratorHtml(),
    chunkGeneratorStatic({ formats: ['css'] }),
  ],
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
    formats: {
      '*.map': '[id].[format]',
      html: '[name].[format]',
      static: '[id][ext]',
      '*': '[id].[format]',
    },
  },
}
