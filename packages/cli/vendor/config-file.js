module.exports = {
  debug: true,
  // ^ Setting this to true sets "process.env.NODE_ENV" to "development" in processed js, it's set to "production" otherwise
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
    sourceMapPath: '/bundle.js.map',
    redirectNotFoundToIndex: true,
  },
  presets: [
    [require.resolve('pundle-preset-default'), {
      // Put any preset config here
    }],
  ],
}
