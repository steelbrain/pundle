/* @flow */

export type Config = {
  save: boolean,
  rootDirectory: string,
  beforeInstall(name: string): void,
  afterInstall(name: string, error: ?Error): void,
}
