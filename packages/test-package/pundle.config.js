import loaderJs from 'pundle-loader-js'
import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'

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
  ],
  rootDirectory: __dirname,
}
