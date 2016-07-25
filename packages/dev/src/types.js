/* @flow */

export type ServerConfig = {
  hmr: boolean,
  port: number,
  hmrPath: string,
  bundlePath: string,
  sourceRoot: ?string,
  sourceMapPath: string,
  error(error: Error): any,
  ready(): any,
}
