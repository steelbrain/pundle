const path = require('path')

module.exports = {
  // debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  // By default, it's true for dev mode and false for anything else
  entry: ['./index.js'],
  rootDirectory: __dirname,
  // ^ The dir that everything including output paths, entries are relative of.
  // Also used by other packages like npm-installer to determine where to install
  // the npm packages.
  replaceVariables: {
    'process.env.SOME_MAGIC_VAR': 5,
    // ^ This will be replaced with numerical value 5 in bundle
    'process.env.ANOTHER_MAGIC_VAR': JSON.stringify('Hello there'),
    // ^ This will be replaced with the string literal provided to JSON.stringify
    MY_REPLACED_GLOBAL: 'variableNameToReplaceWith',
    // ^ This will not be replaced with a string literal but a variable
  },
  output: {
    bundlePath: 'bundle.js',
    sourceMap: true,
    rootDirectory: path.join(__dirname, 'dist'),
  },
  server: {
    port: 8090,
    // hmrHost: 'https://google.com',
    // ^ Only specify if different from the host bundle is served on
    hmrPath: '/__sb_pundle_hmr',
    // ^ Set the hmrPath to null to disable HMR entirely
    // hmrReports: false,
    // ^ Defaults to true, shows cli reports in browser if enabled
    bundlePath: '/bundle.js',
    // useCache: false,
    // ^ Defaults to true, controls dev server boot from cache
    // sourceMap: true,
    // ^ Only specify it if it's different from output.sourceMap
    sourceMapPath: '/bundle.js.map',
    rootDirectory: path.join(__dirname, 'dist'),
    redirectNotFoundToIndex: true,
    // ^ Setting this to true makes it redirect all 404 requests to index
  },
  watcher: {
    usePolling: true,
    // ^ Default value is false, set to true to use polling based FS watching
  },
  presets: [
    ['pundle-preset-default', {
      generator: {
        // pathType: 'number'
        // ^ Default is "filePath", use number to hide file paths in production builds
      },
      // Put any other preset component config here
    }],
  ],
  components: [
    'pundle-plugin-dedupe',
    'pundle-plugin-npm-installer',
    ['pundle-transformer-babel', {
      extensions: ['jsx'],
    }],
  ],
}
