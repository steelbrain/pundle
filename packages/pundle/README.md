Pundle
=========

Pundle is a next generation module bundler. It's written with extensibility and performance in mind and out performs any other bundler out there.

## Installation

```
npm install -g pundle
```

## CLI Usage

```
$ pundle --help

  Usage: pundle [options]

  Options:

    -h, --help                          output usage information
    -V, --version                       output the version number
    -e, --entry [path]                  Pundle entry points
    -p, --path-type <number|filePath>   Output path type
    -r, --root-directory <directory>    Root directory of which all imports would be relative of
    -m, --module-directory [directory]  Directories to search for during module lookup
    -s, --source-map                    Generate source map for output
    --project-name <name>               Project name to show in source map paths
    -o, --output-file <path>            The path to store generated output at
    --source-map-inline                 Wether to output inline source map
    --source-map-output-file <path>     The path to store source map of generated output at
    -w, --watch                         Watch given entry files and recompile on change
    --use-polling                       Use Polling method when watching files

$ pundle --source-map --entry index.js --output-file bundle.js --source-map-output-file bundle.js.map
$ pundle --source-map --entry index.js --output-file bundle.js --source-map-output-file bundle.js.map --watch
```

## API Usage

```js
type GeneratorConfig = {
  contents: Array<File>,
  requires: Array<string>,
  wrapper: 'none' | 'hmr' | 'normal',
  sourceMap: boolean,
  projectName: string,
}
type WatcherConfig = {
  usePolling: boolean,
  ready: (() => any),
  error: ((error: Error) => any),
  generate: (() => any),
}
type PundleConfig = {
  entry: Array<string> | string,
  pathType?: 'number' | 'filePath',
  fileSystem?: FileSystem,
  rootDirectory: string,
  replaceVariables?: Object,
  moduleDirectories?: Array<string>,
}
export default class Pundle {
  constructor( config: PundleConfig )
  async compile(): Promise<void>
  generate( config: GeneratorConfig ): { sourceMap: ?Object, contents: string }
  watch( config: WatcherConfig ): { queue: Promise<void>, subscription: Disposable }
  dispose(): void
}
```

## Example

```
$ mkdir -p /tmp/pundle-example-test
$ cd /tmp/pundle-example-test
$ echo '{}' > package.json
$ echo 'console.log(require("react"))' > index.js
$ npm install react
$ pundle --source-map
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
