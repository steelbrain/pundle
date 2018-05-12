import loaderJs from 'pundle-loader-js'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerCommonJs from 'pundle-transformer-commonjs'

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
    transformerCommonJs(),
  ],
  rootDirectory: __dirname,
}
