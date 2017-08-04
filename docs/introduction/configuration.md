# Configuration

Pundle takes a configuration object by default. Until we get better documentation, here is an example configuration.

## API

Here's the flow type for the config object Pundle takes:

```js
type PundleConfig = {
  debug: boolean,
  entry: Array<string>,
  output: {
    sourceMap?: boolean,
    publicRoot?: string,
    bundlePath?: string,
    sourceMapPath?: string,
    rootDirectory?: string,
  },
  server: {
    port?: number,
    hmrHost?: string,
    hmrPath?: string,
    bundlePath?: string,
    sourceMapPath?: string,
    rootDirectory: string,
    redirectNotFoundToIndex?: boolean,
  },
  presets: Array<Loadable>,
  watcher: {
    usePolling: boolean,
  },
  components: Array<Loadable>,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}
```

## Usage

And here's an example of it in use:

```js
import Pundle from 'pundle'
import Path from 'path'

Pundle.create({
  entry: ['./'],
  debug: true,
  presets: [
    [
      require.resolve('pundle-preset-default'),
      {
        reporter: {
          log: o => this.log(o),
        },
      },
    ],
  ],
  components: [
    [
      require.resolve('pundle-plugin-dedupe'),
      {
        debug: true,
      },
    ],
    require.resolve('pundle-plugin-commons-chunk'),
    [
      require.resolve('pundle-transformer-babel'),
      {
        config: {
          // your babel config
        },
        extensions: ['js'],
      },
    ],
    createPlugin(async (_: Object, __: Object, file: Object) => {
      if (
        (file.filePath.indexOf(__dirname) === 0 &&
          file.filePath.indexOf('node_modules') === -1)
      ) {
        const relative = Path.relative(__dirname, file.filePath)
        this.log(
          `${chalk.dim(Path.join('$root', relative))} ${chalk.green(TICK)}`
        )
      }
    }),
  ],
  output: {
    bundlePath: 'bundle.js',
    publicRoot: '/_/',
  },
  rootDirectory: __dirname,
  replaceVariables: {
    'process.env.NODE_ENV': JSON.stringify(
      development ? 'development' : 'production'
    ),
  },
})
```
