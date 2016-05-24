# Pundle API

Pundle's API is pretty straight forward and easy to get used to. Read the source for full API docs, this document is going to be a domonstration of some simple tasks using Pundle's API.

## Definitions

### Plugin

Pundle accepts plugins and parameters for those plugins, it accepts them using a generic interface mentioned below. These plugins are loaded using `Pundl#loadPlugins`.
```js
type Plugin = string | Function | [string, Object] | [Function, Object]
```

### FileSystem

Pundle supports custom FileSystem via config. Any FileSystem provided must implement this interface

```js
type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}
```

### Config
Pundle has two config definitions

This is the type that pundle can work with (ie. it fills the rest)
```js
type Config = {
  hmr: boolean,
  entry: string | Array<string>,
  resolve?: Object,
  FileSystem?: Function,
  rootDirectory: string,
  sourceMaps?: boolean,
  replaceVariables?: Object
}
```
This is what Pundle transforms the config into
```js
type Config = {
  hmr: boolean,
  entry: Array<string>,
  resolve: Object,
  FileSystem: Function,
  rootDirectory: string,
  replaceVariables: Object
}
```

#### Config.`hmr`
It's a boolean property indicating the wrap to be used around the bundle. If this is set to true, Pundle adds
HMR scripts and contents to allow hot reloading on the fly.

#### Config.`entry`
This properly is either a string or an array of strings, all of these entry points will be reqired on the top level in the generated bundle. Modules not imported by these modules or the modules these modules import would be considered garbage and would be collected on each GC run.

#### Config.`resolve`
This property consists of configuration for the module resolver, [`sb-resolve`][sb-resolve]. It's a module resolver which provides an API similar to WebPack's. It accepts the following options
```js
type Options = {
  root?: string | Array<string>,
  alias?: Object, // Example: {react: 'preact-compat'}
  extensions?: Array<string>,
  packageMains?: Array<string>,
  moduleDirectories?: Array<string>
}
```

#### Config.`FileSystem`
This property allows custom FileSystem interface for Pundle, see above for it's documentation. By default `pundle-fs` is used.

#### Config.`rootDirectory`
This property represents a directory that is treated as `$root`, it's used in module resolution and other plugin-specific purposes.

#### Config.`replaceVariables`
This property represents a map of variables to be replaced in the bundle. It can be useful for advanced purposes, the default value of this property is written below.
```js
{
  'process.env.NODE_ENV': '"deveopment"'
}
```

## Compiling with Pundle

#### Compiling without sourceMap

```js
import Pundle from 'pundle'

const pundle = new Pundle({
  entry: 'index.js',
  rootDirectory: '/path/to/directory',
})

pundle.compile().then(function(result) {
  console.log('result', result)
}, function(error) {
  console.error(error)
})
```

#### Compiling with sourceMap

```js
import Pundle from 'pundle'

const pundle = new Pundle({
  entry: 'index.js',
  rootDirectory: '/path/to/directory',
})

pundle.compile(true).then(function(result) {
  console.log('result', result)
}, function(error) {
  console.error(error)
})
```

## Watching with Pundle

Watching with Pundle directly isn't recommended. We recommend you use `pundle-dev` or `pundle-middleware`.

## Writing Pundle Plugins

Pundle was built with extensibility as it's core principles, therefore writing plugins for it is simple.

#### Writing a module resolver

In this example, a module resolver is going to be demonstrated. It'll allow requiring files from any depth in your app to the top level using the `$` sign. For example, writing `$app` would require `app.js` in the root directory and requiring `$app/database` would require `app/database.js` in the root directory.

```js
import Path from 'path'

module.exports = function pundleResolver(pundle) {
  pundle.path.onBeforeModuleResolve(function(event) {
    if (event.moduleName.indexOf('$') !== 0) {
      return
    }
    event.path = Path.join(pundle.config.rootDirectory, event.moduleName.substr(1))
  })
}
```

---
Got any suggestions or improvements? Submit a PR!

[sb-resolve]:https://github.com/steelbrain/resolve
