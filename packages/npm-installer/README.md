# Pundle-NPM-Installer

Automatically install npm dependencies for Pundle

## Installation

```
npm install --save pundle-npm-installer
```

## Usage

```
const plugins = [
  [require.resolve('pundle-npm-installer'), {
    save: boolean,
    rootDirectory: string,
    restrictToRoot: boolean,
    onAfterInstall: ((id: number, name: string, error: ?Error) => any),
    onBeforeInstall: ((id: number, name: string) => any)
  }]
]
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
