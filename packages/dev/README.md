# Pundle-Dev

Dev Server for Pundle. Provides a nice API to start express server with HMR support.

## Installation

```
npm install --save pundle-dev
```

## Usage

```js
import PundleDev from 'pundle-dev'

const pundle = new PundleDev({
  pundle: pundleConfig,
  watcher: {
    onError(error) {
      console.error(error)
    }
  },
  middleware: {
    sourceMap: true,
    sourceRoot: config.rootDirectory,
    publicPath: '/',
    publicBundlePath: '/_/bundle.js'
  },
  server: {
    port: config.web_server_port
  }
})

pundle.listen()
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
