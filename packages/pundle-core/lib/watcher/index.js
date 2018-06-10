// @flow

import AdapterNSFW from './adapter-nsfw'
import AdapterChokdiar from './adapter-chokidar'
import type { WatchAdapter } from '../types'

export type ChangeType = 'add' | 'delete' | 'modify'
export type ChangeCallback = (type: ChangeType, newPath: string, oldPath: ?string) => void
declare class Adapter {
  constructor(rootDirectory: string, onChange: ChangeCallback): void;
  watch(): Promise<void>;
  close(): void;
}

const Adapters: { [WatchAdapter]: $FlowFixMe } = {
  nsfw: AdapterNSFW,
  chokidar: AdapterChokdiar,
}

export default function getWatcher(adapter: WatchAdapter, rootDirectory: string, onChange: ChangeCallback): Adapter {
  return new Adapters[adapter](rootDirectory, onChange)
}
