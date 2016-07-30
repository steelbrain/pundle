# Babel-Pundle

Babel transformer for Pundle

## Installation

```
npm install --save babel-pundle
```

## Usage

```
pundle.loadPlugins([
  ['babel-pundle', {
    ignored?: RegExp,
    extensions?: ['.js'],
    config: {
      ... babel config ...
    }
  }]
]).then(() => console.log('Plugin loaded successfully'))
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
