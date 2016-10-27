/* @flow */

import { Disposable } from 'sb-event-kit'

export default class Emitter {
  disposed: boolean;
  handlers: Object;

  constructor() {
    this.disposed = false
    this.handlers = {}
  }
  on(eventName: string, handler: Function): Disposable {
    if (this.disposed) {
      throw new Error('Emitter has been disposed')
    }
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function')
    }
    let callbacks = this.handlers[eventName]
    if (typeof callbacks === 'undefined') {
      callbacks = this.handlers[eventName] = [handler]
    } else {
      callbacks.push(handler)
    }
    return new Disposable(() => {
      this.off(eventName, handler)
    })
  }
  off(eventName: string, handler: Function): void {
    if (this.disposed) {
      return
    }
    if (!this.handlers[eventName]) {
      return
    }
    const index = this.handlers[eventName].indexOf(handler)
    if (index !== -1) {
      this.handlers[eventName].splice(index, 1)
    }
  }
  clear(): void {
    this.handlers = {}
  }
  async emitSome(eventName: string, ...params: Array<any>): Promise<any> {
    let value = null
    if (this.disposed || !this.handlers[eventName]) {
      return value
    }
    const callbacks = this.handlers[eventName]
    for (let i = 0, length = callbacks.length; i < length; ++i) {
      value = await callbacks[i].apply(null, params)
      if (value) {
        break
      }
    }
    return value
  }
  async emitAll(eventName: string, ...params: Array<any>): Promise<void> {
    if (this.disposed || !this.handlers[eventName]) {
      return
    }
    const callbacks = this.handlers[eventName]
    for (let i = 0, length = callbacks.length; i < length; ++i) {
      await callbacks[i].apply(null, params)
    }
  }
  dispose(): void {
    this.disposed = true
    this.clear()
  }
}
