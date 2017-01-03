# Pundle Components

Components are the building blocks of the Pundle architecture. You should read the basic introduction of [Components](../introduction/components.md) if you have not already. You should also read the [LifeCycles of Pundle](lifecycles.md) so you can better understand what type of component you need to write to solve a specific problem.

Pundle provides the [`pundle-api`](../../packages/api) package to help package authors write their components. It provides `create*` methods for creating each type of Component. For example, you would invoke the `createLoader(...)` method if you wanted to create a loader component.

Components have different structures depending on their type. Each component and it's structured is explained in their sections below.
It is important to note that all callback methods of the component are invoked with `pundle.compilation` as their thisVar. It allows them to do things like

- `this.report(...)`
- `this.resolve(...)`
- `this.getImportRequest(...)`

Another important thing to note is that all callback methods receive the user-config merged with default config as their first parameter. The given config object is cloned for every invocation so you cannot use it to store state of your component.

All components regardless of their types have two lifecycle methods, `activate()` and `dispose()`. They are invoked when a component is added to Pundle and when Pundle is disposed or the component is removed respectively.

The return value of `create*` methods has these additional properties in addition to the given callbacks.

```js
{
  $type: string,
  $apiVersion: number,
  defaultConfig: Object,
}
```

### Loader Components

Loader Components are represented by the type `loader`. These components add support for new languages to Pundle. Loader Components have a callback that receives a file and returns the processed contents and sourceMap. If you don't want to process a particular request, you can simply return a falsy value from the callback.

Please note that if you want to add support for a language is transpiled into javascript like CoffeeScript or TypeScript, you should **not** write a new loader but should re-use the `pundle-loader-js` instead; and should give it the required extensions in config. It's because TypeScript or any other similar language is transpiled to pure js **before** it's fed to a loader.

Below is the simplest example of a loader (`json`)

```js
const { createLoader, shouldProcess, MessageIssue } = require('pundle-api')

module.exports = createLoader(function(config, file) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(file.contents)
  } catch (_) {
    throw new MessageIssue(`Malformed JSON found at '${file.filePath}'`, 'error')
  }

  return {
    imports: new Set(),
    contents: `module.exports = ${JSON.stringify(parsed)}`,
    sourceMap: null,
    // Or:
    // sourceMap: {
    //   version: 3,
    //   sources: [file.filePath],
    //   names: ...,
    //   mappings: ...,
    // }
  }
}, {
  extensions: ['json'],
  // ^ This is the default configuration for the component
})
```

### Resolver Components

Resolver components are represented by the type `resolver`. They are responsible for finding files required in modules on the file system. In their main callbacks, these components receive the request string, the file it was required from and whether or not to use cache.

Pundle's official default resolver `pundle-resolver-default` should be suitable for most cases, but you might want to write this type of component if you want to intercept every require request. It's especially useful for packages that want to install non-existent npm packages automatically as they are imported in codebase like in `pundle-plugin-npm-installer`. The return value of the main callback should be a string on success and falsy in case resolver was not able to find the file.

The main callback for resolver components receives an extra `knownExtensions` in it's config object. It's an array of all extensions that any registered component accepts. This gives resolvers the ability to work with any new extension without extra configuration.
Also make sure not to throw an error in your resolver if the file is not found. Throwing an error will make pundle halt the resolution process instead of moving on to the next available resolver.

Below is an example resolver that will resolve all request in a file-tree manner, for example requiring `foo.js` from `/dir/bar.js` would resolve to `/dir/foo.js` in it.

```js
const FS = require('sb-fs')
const Path = require('path')
const { createResolver, shouldProcess } = require('pundle-api')

module.exports = createResolver(async function(config, request, from, cached) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }
  const activeDirectory =
    from === null
    // ^ This happens when a file is not required from another file but is main entry
    ? this.config.rootDirectory
    : Path.dirname(from)
  const resolvedPath = Path.resolve(activeDirectory, request)
  if (await FS.exists(resolvedPath)) {
    return resolvedPath
  }
  return null
}, {
  extensions: ['js'],
})
```

### Plugin Components

Plugin Components are general purpose components. They don't alter the output in any way and are able to read the compiled result of each file. They are invoked at the end of the file-processing cycle.

Here's an example of a plugin that outputs the number of imports each file has

```js
const { getRelativeFilePath, createPlugin, MessageIssue } = require('pundle-api')

module.exports = createPlugin(function(config, file) {
  const relativeFilePath = getRelativeFilePath(file.filePath, this.config.rootDirectory)
  this.report(new MessageIssue(`File '${relativeFilePath}' has ${file.imports.size} imports`, 'info'))
}, {})
```
