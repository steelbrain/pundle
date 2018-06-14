// @flow

import AdapterNSFW from './adapter-nsfw'
import AdapterChokdiar from './adapter-chokidar'
import { WatcherUnavailable } from './common'
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

const ADAPTER_ALTERNATIVES: { [WatchAdapter]: WatchAdapter } = {
  nsfw: 'chokidar',
  chokidar: 'nsfw',
}

export default function getWatcher(adapter: WatchAdapter, rootDirectory: string, onChange: ChangeCallback): Adapter {
  if (!Adapters[adapter]) {
    throw new Error(`Unknown watching adapter: ${adapter}`)
  }
  try {
    return new Adapters[adapter](rootDirectory, onChange)
  } catch (error) {
    if (error instanceof WatcherUnavailable) {
      return new Adapters[ADAPTER_ALTERNATIVES[adapter]](rootDirectory, onChange)
    }
    throw error
  }
}
