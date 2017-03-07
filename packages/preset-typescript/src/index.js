/* @flow */

const extensions = ['ts', 'tsx']
export default [
  {
    name: 'loader',
    config: {
      extensions,
    },
    component: require.resolve('pundle-loader-js'),
  },
  {
    name: 'transformer',
    config: {
      extensions,
    },
    component: require.resolve('pundle-transformer-typescript'),
  },
  {
    name: 'resolver',
    config: {
      extensions,
      packageMains: ['browser', 'browserify', 'webpack', 'typescript:main', 'module', 'main'],
    },
    component: require.resolve('pundle-resolver-default'),
  },
]
