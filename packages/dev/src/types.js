/* @flow */

export type ServerConfig = {
  port: number,
  hmrPath: string,
  bundlePath: string,
  sourceRoot: ?string,
  sourceMapPath: string,
  error(error: Error): any,
  ready(): any,
}
