# Pundle Presets

Pundle Presets are collections of Pundle Components with extra default configuration. Collections are useful in that the end user doesn't have to specify the same configuration repeatedly as it can be specified in a preset once.

## Usage

The user can provide configuration for each of the preset's components, which is then merged with the preset's configuration for that component and finally the component's default configuration in order. You can also exclude one or more components from a preset by setting their config to literal `false`.

`pundle-preset-default` is the default recommended preset that has enough to get you started for vanilla javascript development. Presets are often compiled of configurations for a specific language, for example the `pundle-preset-typescript`.

Presets are specified as an array with the `presets` key in the configuration, for example

```js
presets: [
  'pundle-preset-default',
  // ^ Resolves module of same name from root directory and uses default configs
  require.resolve('pundle-preset-default'),
  // ^ Resolves module from the current directory and uses default configuration
  ['pundle-preset-default', {
    reporter: false,
    'loader-js': {
      extensions: ['js', 'jsx'],
    },
  }],
  // ^ Resolves module from root directory, disables the reporter component and specifies config for loader-js
  [myPundlePreset, {
    reporter: {
      log: content => console.log('log', content),
    },
  }],
  // ^ Use local variable as preset while defining config for the reporter component
]
```

The keys for configuration of the components are defined by presets, you should read a preset's documentation to figure out the keys it supports.

## Writing Presets

Please refer to the [Presets](../technical/presets.md) Technical documentation for information about authoring presets.

---

[Documentation Home](../) | [Configuration](configuration.md)
