/* @flow */

export type CLIOptions = {
  dev: boolean,
  port?: number,
  debug: boolean,

  disableCache: boolean,
  rootDirectory: string,
  configFileName: string,
  serverRootDirectory?: string,
}

export type CLIConfig = {
  output: {
    bundlePath: string,
    sourceMap: boolean,
    sourceMapPath: string,
    rootDirectory: string,
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
