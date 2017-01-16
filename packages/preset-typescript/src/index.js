/* @flow */

export default [
  {
    name: 'loader',
    config: {
      extensions: ['ts', 'tsx'],
    },
    component: require.resolve('pundle-loader-js'),
  },
  {
    name: 'transformer',
    config: {
      extensions: ['ts', 'tsx'],
    },
    component: require.resolve('pundle-transformer-typescript'),
  },
  {
    name: 'resolver',
    config: {
      extensions: ['ts', 'tsx'],
      packageMains: ['browser', 'browserify', 'webpack', 'typescript:main', 'module', 'main'],
    },
    component: require.resolve('pundle-resolver-default'),
  },
]
