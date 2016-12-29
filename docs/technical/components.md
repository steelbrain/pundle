# Pundle Components

Components are the building blocks of the Pundle architecture. Please read the basic introduction of [Components](../introduction/components.md) if you have not already. You should also read the [LifeCycles of Pundle](../introduction/lifecycles.md) so you can better understand what type of component you need to write to solve a specific problem.

Pundle provides the [`pundle-api`](../../packages/api) package to help package authors write their components. It provides `create*` methods for creating each type of Component. For example, you would invoke the `createLoader(...)` method if you wanted to create a loader component.

There are several types of components, each having a unique priority and place for execution. Their structure is shown below, it consists of three callbacks. The `activate()` and `dispose()` are entirely optional. The `callback()` is a requirement for all but `simple` type of components.

```js
type Component = {
  activate?: Function,
  callback?: Function,
  dispose?: Function,
}
```

The main callback is invoked depending on the type of each component, while `activate()` is added when a component is loaded into Pundle and `dispose()` when it's removed or Pundle itself is disposed.

It is also important to note that each callback in the Component structure is executed with `pundle.compilation` as their thisVar. It allows them to do things like

- `this.report(...)`
- `this.resolve(...)`
- `this.getImportRequest(...)`

The component creation methods accept two parameters. First one being the main callback or an object with the callbacks described on the type above. The second component is optional and is the default configuration of the component. One particular creation method `createResolver` however accepts three, you can find more about it in it's section.

The return value of component creation methods is shown below. You can either export that value or use it directly in the configuration.

```js
{
  $type: string,
  $apiVersion: number,
  activate(config): void,
  callback(config, ...): ...,
  dispose(config): void,
  defaultConfig: Object,
}
```

## Types used by Components

Types provided here are for reference and will be used throughout this document.

```js
type Import = {
  id: number,
  from: string,
  request: string,
  resolved: ?string,
}
type File = {
  source: string,
  imports: Set<Import>,
  filePath: string,
  // ^ The absolute path on file system
  contents: string,
  sourceMap: ?Object,
}
type ComponentRule = string | RegExp
type ComponentRules = {
  include?: ComponentRule | Array<ComponentRule>,
  exclude?: ComponentRule | Array<ComponentRule>,
  extensions?: Array<string>,
  // ^ extensions without the dot
}
```

### Simple Components

Simple components are represented by the type `simple`. These components only have `activate()` and `dispose()` callbacks. This is useful for [FlowType](https://flowtype.org/) and similar software that run a daemon in the background and report errors as files are changed.

An example simple component is demonstrated below, please note that it focuses only on component creation therefore things like imports are kept out of this demonstration.

```js
module.exports = createSimple({
  activate(config) {
    // TODO: Do something here
  },
  dispose(config) {
    // TODO: Do something here
  },
}, {
  flowBin: 'flow',
})
```
