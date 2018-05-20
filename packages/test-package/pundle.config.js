import path from 'path'
import loaderJs from 'pundle-loader-js'
import loaderHtml from 'pundle-loader-html'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerJS from 'pundle-transformer-js'
import chunkGeneratorJs from 'pundle-chunk-generator-js'
import chunkGeneratorHtml from 'pundle-chunk-generator-html'
import browserAliases from 'pundle-resolver-aliases-browser'

export default {
  entry: ['./src', './index.html'],
  components: [
    cliReporter(),
    resolverDefault({
      formats: {
        js: ['.js', '.mjs', '.json'],
        html: ['.html'],
      },
      aliases: browserAliases,
    }),
    loaderJs({}),
    loaderHtml({}),
    transformerJS({
      transformCore: true,
    }),
    chunkGeneratorJs(),
    chunkGeneratorHtml(),
  ],
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
    formats: {
      '*.map': '[id].[format]',
      html: '[name].[format]',
      js: '[id].[format]',
    },
  },
}
