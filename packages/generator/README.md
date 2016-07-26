Pundle-Generator
==================

The default output generator for Pundle. It supports source maps and configurable wrappers. You can fork this package, make your changes and supply that to `pundle.generate({ generator })`.

## Configuration

This package supports the following type as it's configuration

```js
type Config = {
  contents: Array<File>,
  requires: Array<string>,
  wrapper: 'none' | 'hmr' | 'normal',
  sourceMap: boolean,
  projectName: string,
}
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.
