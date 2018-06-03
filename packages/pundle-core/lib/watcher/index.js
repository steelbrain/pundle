// @flow

import AdapterChokdiar from './adapter-chokidar'
import type { WatchAdapter } from '../types'

declare class Adapter {
  constructor(rootDirectory: string, onChange: (path: string) => void): void;
  watch(): Promise<void>;
  close(): void;
}

const Adapters: { [WatchAdapter]: $FlowFixMe } = {
  chokidar: AdapterChokdiar,
}

export default function getWatcher(adapter: WatchAdapter, rootDirectory: string, onChange: (path: string) => void): Adapter {
  return new Adapters[adapter](rootDirectory, onChange)
}
