/* @flow */

export type Middleware = {
  hmrPath: ?string,
  // NOTE: ^ Set to null to disable hmr
  bundlePath: string,
  publicPath: string,
  sourceMapPath: 'none' | 'inline' | string,
}
