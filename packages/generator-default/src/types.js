/* @flow */

export type Config = {
  entry: Array<string>,
  // ^ If this is not provided, then entry from Pundle's config is used
  wrapper: 'normal' | 'hmr',
  filename: string,
  pathType: 'filePath' | 'number',
  directory: string,
  sourceMap: boolean,
  sourceMapNamespace: string,
}
