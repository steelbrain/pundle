/* @flow */

export type Config = {
  entry: Array<string>,
  // ^ If this is not provided, then entry from Pundle's config is used
  wrapper: 'normal' | 'hmr' | 'none' | string,
  filename: string,
  pathType: 'filePath' | 'number',
  directory: string,
  sourceMap: boolean,
  sourceMapNamespace: string,
}

export type ModuleNormal = {
  filePath: string,
  callback(__filename: string, __dirname: string, require: Function, module: Object, exports: Object): void,
  exports: Object,
  parents: Array<string>,
}

export type ModuleHMR = ModuleNormal & {
  hot: {
    data: Object,
    accept(): void,
    decline(): void,
    dispose(): void,
    addDisposeHandler(): void,
    removeDisposeHandler(): void,
  },
}
