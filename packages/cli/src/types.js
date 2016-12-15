/* @flow */

export type CLIConfig = {
  output: {
    bundlePath: string,
    sourceMap: boolean,
    sourceMapPath: string,
  },
  server: {
    port: number,
    hmrPath: string,
    bundlePath: string,
    sourceMap: boolean,
    devDirectory: string,
    sourceMapPath: string,
    redirectNotFoundToIndex: boolean,
  },
}
