/* @flow */

export default [
  { component: require.resolve('pundle-loader-js'), config: {}, name: 'loader-js' },
  { component: require.resolve('pundle-loader-json'), config: {}, name: 'loader-json' },
  { component: require.resolve('pundle-resolver-default'), config: {}, name: 'resolver' },
  { component: require.resolve('pundle-generator-default'), config: {}, name: 'generator' },
  { component: require.resolve('pundle-reporter-cli'), config: {}, name: 'reporter' },
]
