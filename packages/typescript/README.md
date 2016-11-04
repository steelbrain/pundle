# `typescript-pundle`

TypeScript transformer for Pundle

## Installation

```
npm install --save typescript-pundle
```

## Usage

```
pundle.loadPlugins([
  ['pundle-typescript', {
    ignored?: RegExp,
    extensions?: ['.ts'],
    config: {
      ... TypeScript config ...
    }
  }]
]).then(() => {
  pundle.loadLoaders([
    { extensions: ['.ts'], loader: require('pundle/lib/loaders/javascript').default },
  ])
  console.log('Plugin loaded successfully')
)
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
