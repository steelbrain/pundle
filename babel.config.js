const config = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 6,
        },
      },
    ],
    '@babel/preset-flow',
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],
}

module.exports = config
