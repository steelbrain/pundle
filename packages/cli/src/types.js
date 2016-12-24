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
    hmrHost: string,
    hmrReports: boolean,
    bundlePath: string,
    sourceMap: boolean,
    rootDirectory: string,
    sourceMapPath: string,
    redirectNotFoundToIndex: boolean,
  },
}
