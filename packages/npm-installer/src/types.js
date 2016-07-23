/* @flow */

export type Config = {
  save: boolean,
  rootDirectory: string,
  error(error: Error): void,
  beforeInstall(name: string): void,
  afterInstall(name: string): void,
}
