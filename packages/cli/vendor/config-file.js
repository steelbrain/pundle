const path = require('path')

module.exports = {
  debug: true,
  // ^ Setting this to true replaces "process.env.NODE_ENV" in bundle to
  // "development", it's set to "production" otherwise
  entry: ['./index.js'],
  output: {
    bundlePath: '/bundle.js',
    sourceMap: true,
    sourceMapPath: '/bundle.js.map',
  },
  server: {
    port: 8090,
    hmrPath: '/__sb_pundle_hmr',
    bundlePath: '/bundle.js',
    // sourceMap: true,
    // ^ Only specify it if it's different from output.sourceMap
    devDirectory: path.join(__dirname, 'static'),
    sourceMapPath: '/bundle.js.map',
    redirectNotFoundToIndex: true,
  },
  presets: [
    [require.resolve('pundle-preset-default'), {
      // Put any preset config here
    }],
  ],
}
