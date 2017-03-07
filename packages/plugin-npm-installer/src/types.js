/* @flow */

export type Config = {
  save: boolean,
  beforeInstall(name: string): void,
  afterInstall(name: string): void,
}
