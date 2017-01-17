# Pundle Components

Components are the building blocks of the Pundle architecture. Pundle is essentially a lightweight core wrapped around with configurable components.

Several components can be joined together into [Presets](./presets.md).

## Usage

Components are resolved from the root directory of your Pundle project or the root directory specified in the configuration file; The configuration file takes precedence. If you have the component defined in the local file or a non-standard path, you can pass in it's full path or the component object itself directly.

Each component has a default configuration, which is then merged with the Preset configuration for that component and finally with the user configuration in order. Most of the components use the three options `include`, `exclude` and `extensions` to determine if the specific file should be processed (if relevant). Respecting these rules is entirely upto the component; you should consult the component docs if you are in doubt.

Components are specified as an array with the `components` key in the configuration, for example

```js
components: [
  'component-module-name',
  // ^ For when component-module-name is installed inside root directory
  require.resolve('../component-a'),
  // ^ For when component is installed or present in the non-standard directory
  ['my-component', {
    extensions: ['js'],
  }],
  // ^ Specifying the component with some configuration
  [require.resolve('../component-b'), {
    exclude: [/node_modules/],
  }],
  // ^ Specifying local component with some configuration
  [myLoaderComponent, {
    exclude: [/node_modules/],
  }],
  // ^ Specifying the component value directly with some configuration
],
```

## Writing Components

Please refer to the [Components](../technical/components.md) Technical documentation for information about authoring components.


---

[Documentation Home](../) | [Configuration](configuration.md)
