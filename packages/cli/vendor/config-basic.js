const path = require('path')

module.exports = {
  debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  entry: ['./index.js'],
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
    // require.resolve('pundle-transformer-babel'),
    // ^ Uncomment to enable babel compilation of all js files (except node_modules)
  ],
}
