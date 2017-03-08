# Pundle Presets

Pundle Presets are collections of Pundle Components with extra default configuration. You should read the basic introduction of [Presets](../introduction/presets.md) if you haven't already.

Please note that the `component` prop value should either be the component object or the absolute file path, relative paths or relative imports do not work (at the time of writing this document).

```js
module.exports = [
  {
    name: 'loader',
    config: {
      extensions: ['js', 'jsx'],
    },
    component: require.resolve('pundle-loader-js'),
  },
  {
    name: 'reporter'
    config: {},
    component: require.resolve('pundle-reporter-default'),
  },
]
```

The above preset defines two keys of configuration, `loader` and `reporter`. The preset consumer can use these two to add configuration that would get merged into and take precendence over the configuration defined in the preset. The preset consumer can also set the configuration value of a component to literal `false` to disable that specific component.

---

[Documentation Home](../)
