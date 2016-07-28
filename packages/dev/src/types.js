/* @flow */

export type ServerConfig = {
  hmr: boolean,
  port: number,
  hmrPath: string,
  bundlePath: string,
  sourceRoot: ?string,
  sourceMapPath: string,
  ready(): any,
  error(error: Error): any,
  generated(updatedFiles: Set<string>): any,
}
