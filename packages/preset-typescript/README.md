# Pundle Preset Typescript

### Usage

If you want to include the preset with default configurations, add it to your preset like

```js
presets: ['pundle-preset-typescript']
```

But if you want to configure any of `loader`, `transformer` or `resolver` components of the preset,
simply pass in their configurations

```js
presets: [
  ['pundle-preset-typescript', {
    loader: { extensions: ['jsts'] },
    transformer: { extensions: ['jsts'] },
    resolver: { extensions: ['jsts'] },
  }]
]
```

### License

This project is licensed under the terms of MIT License. See the root of the github repo for more info.
