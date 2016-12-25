const path = require('path')
const fileSystem = require('pundle-fs')
// ^ You can replace it with a file-system of your choice

module.exports = {
  debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  entry: ['./index.js'],
  fileSystem,
  rootDirectory: __dirname,
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
    tick(filePath, error) {
      console.log(`${filePath} ${error ? 'had error during compile' : 'was compiled successfully'}`)
    },
    update(filePath, newImports, oldImports) {
      console.log(`${filePath} was updated`)
      console.log('All imports in the last processed version', oldImports)
      console.log('All imports in the new processed version', newImports)
    },
    ready(initialCompileStatus, totalFiles) {
      // ^ To see what type of objects are in totalFiles, look for "File" type in docs
      if (initialCompileStatus) {
        console.log('All files had no syntax or import errors and initial build was successful')
      } else {
        console.log('Some file(s) had errors during initial compile')
      }
      console.log('Successfully processed files: ', totalFiles.length)
    },
    compile(totalFiles) {
      // ^ To see what type of objects are in totalFiles, look for "File" type in docs
      console.log('Bundle is ready for initial compile or was updated recently')
      console.log('Generate output of', totalFiles.length, 'files here')
    },
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
