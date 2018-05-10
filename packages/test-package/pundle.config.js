import cliReporter from 'pundle-reporter-cli'
import resolverDefault from 'pundle-resolver-default'

export default {
  entry: ['./src'],
  components: [
    cliReporter(),
    resolverDefault({
      extensions: ['.js'],
    }),
  ],
  rootDirectory: __dirname,
}
