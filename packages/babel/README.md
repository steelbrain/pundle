# Babel-Pundle

Babel transformer for Pundle

## Installation

```
npm install --save babel-pundle
```

## Usage

```
const plugins = [
  [require.resolve('babel-pundle'), {
    ignored?: RegExp,
    include?: RegExp,
    config: {
      ... babel config ...
    }
  }]
]
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
