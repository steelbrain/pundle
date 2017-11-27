// @flow

import AdapterChokdiar from './adapter-chokidar'
import type { WatcherAdapter } from '../types'

declare class Adapter {
  constructor(rootDirectory: string, onChange: (path: string) => void): void;
  watch(): Promise<void>;
  close(): void;
}

const Adapters: { [WatcherAdapter]: any } = {
  chokidar: AdapterChokdiar,
}

export default function getWatcher(
  adapter: WatcherAdapter,
  rootDirectory: string,
  onChange: (path: string) => any,
): Adapter {
  return new Adapters[adapter](rootDirectory, onChange)
}
