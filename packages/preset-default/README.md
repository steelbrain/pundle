# Pundle Preset Default

### Usage

If you want to include the preset with default configurations, add it to your configuration like

```js
presets: ['pundle-preset-default']
```

But if you want to configure any of `loader-js`, `loader-json`, `transformer`, `generator` or `resolver` components of the preset, simply pass in their configurations

```js
presets: [
  ['pundle-preset-defeault', {
    generator: {
      sourceMap: true,
      sourceMapPath: 'inline',
    },
  }]
]
```

### License

This project is licensed under the terms of MIT License. See the root of the github repo for more info.
