# Pundle-NPM-Installer

Automatically install npm dependencies for Pundle

## Installation

```
npm install --save pundle-npm-installer
```

## Usage

```
pundle.loadPlugins([
  [require.resolve('pundle-npm-installer'), {
    save: boolean,
    rootDirectory: string,
    beforeInstall(name: string): void,
    afterInstall(name: string, error: ?Error): void,
  }]
]).then(() => console.log('Plugin loaded successfully'))
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
