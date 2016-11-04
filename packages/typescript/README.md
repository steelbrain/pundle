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
    extensions?: ['.ts'],
    config: {
      ... TypeScript config ...
    }
  }]
]).then(() => {
  pundle.loadLoaders([
    { extensions: ['.ts', '.tsx'], loader: require('typescript-pundle').default },
  ])
  console.log('Plugin loaded successfully')
)
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
