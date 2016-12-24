# Pundle Preset Default

### Configuration

If you want to include the preset with default configurations, add it to your configuration like

```js
presets: ['pundle-preset-default']
```

But if you want to configure any of `loader-js`, `loader-json`, `transformer`, `generator`, `reporter` or `resolver` components of the preset, simply pass in their configurations

```js
presets: [
  ['pundle-preset-default', {
    generator: {
      sourceMap: true,
      sourceMapPath: 'inline',
    },
  }]
]
```

## Excluding some components

To disable specific components in a preset, simply set it's config property to `false`, for example

```js
presets: [
  ['pundle-preset-default', {
    reporter: false,
  }]
]
```

### License

This project is licensed under the terms of MIT License. See the root of the github repo for more info.
