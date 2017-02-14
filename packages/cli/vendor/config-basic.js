const path = require('path')

module.exports = {
  // debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  // By default, it's true for dev mode and false for anything else
  entry: ['./index.js'],
  output: {
    bundlePath: 'bundle.js',
    sourceMap: true,
    sourceMapPath: 'bundle.js.map',
    rootDirectory: path.join(__dirname, 'static'),
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
    // sourceMap: true,
    // ^ Only specify it if it's different from output.sourceMap
    sourceMapPath: '/bundle.js.map',
    rootDirectory: path.join(__dirname, 'static'),
    redirectNotFoundToIndex: true,
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
    // 'pundle-transformer-babel',
    // ^ Uncomment to enable babel compilation of all js files (except node_modules)
    // 'pundle-plugin-dedupe',
    // ^ Uncomment to reduce output sizes and speed up bundle
  ],
}
