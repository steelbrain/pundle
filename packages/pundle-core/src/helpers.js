// @flow

import get from 'lodash/get'
import set from 'lodash/set'

type RetVal = Object

export function processPayload(data: Object): RetVal {
  return data
}

export function processReceived(data: RetVal, options: { buffers?: Array<string> } = {}) {
  const buffers = options.buffers || []

  if (buffers.length) {
    buffers.forEach(key => {
      const value = get(data, key)
      if (value && value.type === 'Buffer') {
        set(data, key, Buffer.from(value.data))
      }
    })
  }

  return data
}
