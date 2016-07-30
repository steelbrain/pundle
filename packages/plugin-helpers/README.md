# Pundle-Plugin-Helpers

This module is a collection of helpers for your [Pundle](https://github.com/motion/pundle) Loaders and Plugins.

### Example Usage

```js
import * as Helpers from 'pundle-plugin-helpers'
// TODO: Write the rest of it
```

### API

```js

type Rule = string | RegExp
type Config = {
  include?: Rule | Array<Rule>,
  exclude?: Rule | Array<Rule>,
  extensions: Array<string>,
}

export function matchesRules(sourceRoot: string, filePath: string, rules: Array<Rule>, exclude: boolean = true): boolean;
export function shouldProcess(sourceRoot: string, filePath: string, config: Config): boolean;
```

### License

This project is licensed under the terms of MIT License. See the root of the github repo for more info.
