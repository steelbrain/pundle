import path from 'path'
import loaderJs from 'pundle-loader-js'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerJS from 'pundle-transformer-js'
import chunkGeneratorJs from 'pundle-chunk-generator-js'

export default {
  entry: ['./src'],
  components: [
    cliReporter(),
    resolverDefault({
      formats: {
        js: ['.js', '.mjs', '.json'],
      },
    }),
    loaderJs({}),
    transformerJS(),
    chunkGeneratorJs(),
  ],
  rootDirectory: __dirname,
  output: {
    rootDirectory: path.join(__dirname, 'dist'),
    formats: {
      '*.map': '[id].[format]',
      js: '[id].[format]',
    },
  },
}
