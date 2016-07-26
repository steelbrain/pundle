# Pundle-Dev

Dev Server for Pundle. Provides a nice CLI & API to start express server with HMR support.

## Installation

```
npm install --save pundle-dev
```

## Example

```
$ mkdir -p /tmp/pundle-example-test
$ cd /tmp/pundle-example-test
$ echo '{}' > package.json
$ echo 'console.log(require("react"))' > index.js
$ echo '<script src="/_/bundle.js"></script>' > index.html
$ npm install react
$ pundle-dev --source-map --hmr
```

## CLI Usage

```
$ pundle-dev --help

  Usage: pundle-dev [options]

  Options:

    -h, --help                          output usage information
    -V, --version                       output the version number
    -e, --entry [path]                  Pundle entry points
    -p, --path-type <number|filePath>   Output path type
    -r, --root-directory <directory>    Root directory of which all imports would be relative of
    -m, --module-directory [directory]  Directories to search for during module lookup
    -s, --source-map                    Generate source map for output
    --project-name <name>               Project name to show in source map paths
    --port <number>                     The port to listen on
    --hmr                               Enable Hot Module Replacement
    --hmr-path <path>                   Path to listen for HMR on
    --bundle-path <path>                Path to serve bundle from
    --source-map-path <path>            Path to serve source maps from
    --source-root <path>                Optional source root to serve files on server from
    -w, --watch                         Watch given entry files and recompile on change
    --use-polling                       Use Polling method when watching files

$ pundle-dev --source-map --entry index.js --source-root ./public
$ pundle-dev --source-map --entry index.js --hmr
```

## API Usage

```js
import Server from 'pundle-dev'

const server = new Server({
  server: {
    hmr: boolean,
    port: number,
    hmrPath: string,
    bundlePath: string,
    sourceRoot: ?string,
    sourceMapPath: string,
    error(error: Error): any,
    ready(): any,
  },
  pundle: PundleConfig,
  watcher: WatcherConfig,
  generator: GenereatorConfig,
})

server.pundle.applyPlugins(plugins)
server.activate().catch(function() {
  console.log('activation failed')
})
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
