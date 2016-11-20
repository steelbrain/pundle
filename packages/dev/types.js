/* @flow */

export type MiddlewareConfig = {
  hmrPath: ?string,
  // NOTE: ^ Set to null to disable hmr
  bundlePath: string,
  publicPath: string,
  sourceMapPath: 'none' | 'inline' | string,
}

export type ServerConfig = {
  port: number,
  directory: string,
}
