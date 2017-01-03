# Pundle Components

Components are the building blocks of the Pundle architecture. You should read the basic introduction of [Components](../introduction/components.md) if you have not already. You should also read the [LifeCycles of Pundle](lifecycles.md) so you can better understand what type of component you need to write to solve a specific problem.

Pundle provides the [`pundle-api`](../../packages/api) package to help package authors write their components. It provides `create*` methods for creating each type of Component. For example, you would invoke the `createLoader(...)` function if you wanted to create a loader component.

Components have different structures depending on their type. Each component and it's structured is explained in their sections below.
It is important to note that all callback methods of the component are invoked with `pundle.compilation` as their thisVar. It allows them to do things like

- `this.report(...)`
- `this.resolve(...)`
- `this.getImportRequest(...)`

Another important thing to note is that all callback methods receive the user-config merged with default config as their first parameter. The given config object is cloned for every invocation so you cannot use it to store state of your component.

All components regardless of their types have two lifecycle methods, `activate()` and `dispose()`. They are invoked when a component is added to Pundle and when Pundle is disposed or the component is removed respectively.

The return value of `create*` methods has these properties in addition to the given callbacks.

```js
{
  $type: string,
  $apiVersion: number,
  defaultConfig: Object,
}
```

### Loader Components

Loader Components add support for new languages to Pundle. Loader Components have a callback that receives a file and returns the processed contents and sourceMap. If you don't want to process a particular request, you can simply return a falsy value from the callback.

Please note that if you want to add support for a language is transpiled into javascript like CoffeeScript or TypeScript, you should **not** write a new loader but should re-use the `pundle-loader-js` instead; and give it the required extensions in config. It's because TypeScript or any other similar language is transpiled to pure js **before** it's fed to a loader. Have a look at `pundle-preset-typescript` for an idea.

Below is an example of a JSON loader

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

Resolver components are responsible for finding files required in modules on the file system. The main callback of these components receives the request string, the file it was required from (optional) and whether or not to use cache.

Pundle's official default resolver `pundle-resolver-default` should be suitable for most cases, but you might want to write this type of component if you want to intercept every require request. It's especially useful for components that want to install non-existent npm packages automatically as they are imported in codebase like in `pundle-plugin-npm-installer`. The return value of the main callback should be a string on success and falsy in case resolver was not able to find the file.

The main callback for resolver components receives an extra `knownExtensions` in it's config object. It's an array of all known extensions known to Pundle through different components. This gives resolvers the ability to work with any new extension without extra configuration. Also make sure not to throw an error in your resolver if the file is not found. Throwing an error will make pundle halt the resolution process instead of moving on to the next available resolver.

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

### Reporter Components

Reporter Components are used to output the reports of Pundle core or other components. It has a main callback that recieves an error or any `Issue` constructed by `pundle-api` package.

Reporter Components are where all of `pundle.compilation.report(...)` results goto. Each report is fed to all of registered reporter components. Each of them can have different means of output. For example, the default reporter writes the errors and other output to CLI, you could write one to output to websockets etc.

Here's an example reporter that writes the errors onto the console

```js
const { createReporter } = require('pundle-api')

module.exports = createReporter(function(config, issue) {
  const severity = issue.severity || 'error'
  console.log(`${severity}: ${issue.message}`)
}, {})
```

### Generator Components

Generator Components generate the javascript output for the browser, concatinating all of the individual processed modules into one big module that can be served directly.

Generators receive an array of modules to generate output of as their second parameter, first being the component configuration. They are expected to have a config `wrapper` that supports `normal`, `hmr` and `none` to function properly with Pundle's core. In addition to that, generators are also expected to respect `inline` as `sourceMapPath` option when specified.

Generators are components too complex to write a functional example of in this doc. Please have a look at [`pundle-generator-default`](../../packages/generator-default)'s source code for more information.

## Transformer Components

Transformers Components are Pundle's source-to-source converters. They are useful for compiling languages like CoffeeScript or TypeScript to pure Javascript. They are also used to transpile ESNext into ESCurrent using Babel or other transpilers.

You should note that if you want to add support of a language that is transformed into javascript, you should also addd `pundle-loader-js` with the extensions configured (unless it's `js`). If you are compiling from less to css for example, in addition to the less transformer you should also be adding a css loader to your configuration.

[`pundle-transformer-typescript`](../../packages/transformer-typescript) and [`pundle-transformer-babel`](../../packages/transformer-babel) are examples of Transformer components.

## Post Transformer Components

Post Transformer Components perform operations on a fully generated output bundle. The component's main callback recieves the contents of the generated bundle as a string that the operations must be performed on.

The operations of a post transformer include uglifying and prettifying the entire output, for example, here's an uglifyjs post-transformer

```js
const { minify } = require('uglify-js')
const { createPostTransformer } = require('pundle-api')

module.exports = createPostTransformer(function(config, contents) {
  const processed = minify(contents, Object.assign({}, config.config, {
    fromString: true,
  }))

  return {
    contents: processed.code,
    sourceMap: processed.map,
  }
}, {
  config: {},
})
```

## Watcher Components

Watcher Components are Pundle components that have more than one main callback. They are used when Pundle is running in watcher or dev server mode. Watcher Components usually have `tick`, `ready` and `compile` callbacks.

These components are useful for usecases like ESLint and TypeScript checker. They provide real time reports in browser (if configured) as well as the CLI.

Here's an example Watcher Component that logs to the console on lifecycle events

```js
const { createWatcher } = require('pundle-api')

module.exports = createWatcher({
  tick(filePath, error, file) {
    if (error) {
      console.log('Error processing', filePath)
    } else {
      console.log(`${filePath} has ${file.imports.size} imports`)
    }
  },
  async ready(initialCompileStatus, files) {
    if (initialCompileStatus) {
      console.log('number of files in bundle', files.length)
      console.log('generated', await this.generate(files))
    } else {
      console.log('Initial compile failed, there was probably an unresolved require or syntax error somewhere')
    }
  },
  await compile(files) {
    console.log('Files should be generated as they have changed and are ready again')
    console.log('generated', await this.generate(files))
  },
}, {})
```

## Notes

- All of the life cycle callbacks can return Promises
- Callbacks that have to process a file and return a sourceMap and new contents don't have to go through the trouble of merging the sourceMap with the old one. They can just return the new sourceMap, it's merged with the old one to create a multi-step-sourceMap directly.
