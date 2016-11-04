# `typescript-pundle`

TypeScript transformer for Pundle

## Installation

```
npm install --save typescript-pundle
```

## Usage

```
pundle.loadPlugins([
  ['typescript-pundle', {
    ignored?: RegExp,
    extensions?: ['.js'],
    config: {
      ... TypeScript config ...
    }
  }]
]).then(() => console.log('Plugin loaded successfully'))
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
