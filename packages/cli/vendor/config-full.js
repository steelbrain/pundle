const path = require('path')
const fileSystem = require('pundle-fs')
// ^ You can replace it with a file-system of your choice

module.exports = {
  // debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  // By default, it's true for dev mode and false for anything else
  entry: ['./index.js'],
  fileSystem,
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
    sourceMapPath: 'bundle.js.map',
  },
  server: {
    port: 8090,
    // hmrHost: 'https://google.com',
    // ^ Only specify if different from the host bundle is served on
    hmrPath: '/__sb_pundle_hmr',
    // hmrReports: false,
    // ^ Defaults to true, shows cli reports in browser if enabled
    bundlePath: '/bundle.js',
    // sourceMap: true,
    // ^ Only specify it if it's different from output.sourceMap
    sourceMapPath: '/bundle.js.map',
    rootDirectory: path.join(__dirname, 'static'),
    redirectNotFoundToIndex: true,
  },
  watcher: {
    usePolling: true,
    // ^ Default value is false, set to true to use polling based FS watching
  },
  presets: [
    [require.resolve('pundle-preset-default'), {
      generator: {
        // pathType: 'number'
        // ^ Default is "filePath", use number to hide file paths in production builds
      },
      // Put any other preset component config here
    }],
  ],
  components: [
    require.resolve('pundle-plugin-npm-installer'),
    [require.resolve('pundle-transformer-babel'), {
      extensions: ['jsx'],
    }],
  ],
}
