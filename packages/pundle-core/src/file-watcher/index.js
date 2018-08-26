// @flow

import debounce from 'lodash/debounce'
import AdapterChokdiar from './adapter-chokidar'
import type { WatchAdapter } from '../types'

export type ChangeType = 'add' | 'delete' | 'modify'
export type ChangeCallback = (type: ChangeType, oldPath: string, newPath: ?string) => void
declare class Adapter {
  constructor(rootDirectory: string, onChange: ChangeCallback): void;
  watch(): Promise<void>;
  close(): void;
}

const Adapters: { [WatchAdapter]: $FlowFixMe } = {
  chokidar: AdapterChokdiar,
}

export default function getWatcher(adapter: WatchAdapter, rootDirectory: string, onChange: ChangeCallback): Adapter {
  if (!Adapters[adapter]) {
    throw new Error(`Unknown watching adapter: ${adapter}`)
  }

  let events = []
  const invokeOnChange = debounce(function invokeOnChange() {
    events.forEach(item => {
      onChange(item.type, item.oldPath, item.newPath)
    })
    events = []
  }, 100)

  return new Adapters[adapter](rootDirectory, function(type, oldPath, newPath) {
    events.push({ type, oldPath, newPath })
    invokeOnChange()
  })
}
