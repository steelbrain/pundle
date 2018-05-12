import loaderJs from 'pundle-loader-js'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'
import transformerJS from 'pundle-transformer-js'

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
  ],
  rootDirectory: __dirname,
}
