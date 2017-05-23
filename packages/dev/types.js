/* @flow */

import type { File, FileChunk } from 'pundle-api/types'

export type ServerConfig = {
  hmrHost?: ?string,
  hmrPath: string,
  useCache: boolean,
  hmrReports: boolean,
  bundlePath: string,
  sourceMap: boolean,
  sourceMapPath: 'inline' | string,
  redirectNotFoundToIndex: boolean,
  port: number,
  rootDirectory: string,
}

export type ServerConfigInput = {
  hmrHost?: ?string,
  // NOTE: Must specify protocol, for example "https://google.com"
  hmrPath: ?string,
  // NOTE: ^ Set to null to disable hmr
  useCache?: boolean,
  hmrReports?: boolean,
  // NOTE: ^ Set to false to hide `Sending HMR` reports
  bundlePath?: string,
  sourceMap?: boolean,
  sourceMapPath?: 'inline' | string,
  redirectNotFoundToIndex?: boolean,
  // ^ Setting this to true makes it redirect all 404 requests to index

  // These configs are required
  port: number,
  rootDirectory: string,
}

export type ServerState = {
  queue: Promise<void>,
  files: Map<string, File>,
  chunks: Array<FileChunk>,
  changed: Map<string, File>,
}
