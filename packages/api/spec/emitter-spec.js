/* @flow */

import { it } from 'jasmine-fix'
import Emitter from '../src/emitter'

describe('Emitter', function() {
  function getEmitter() {
    // Wrapping in a function to avoid flow errors in invalid usages
    return new Emitter()
  }
  function wait(timeout) {
    return new Promise(function(resolve) {
      setTimeout(resolve, timeout)
    })
  }

  it('has a working lifecycle', async function() {
    let params = []
    let calledSomething = 0
    let calledSomethingElse = 0

    const emitter = getEmitter()
    const callbackSomething = function(...givenParams) {
      calledSomething++
      expect(givenParams).toEqual(params)
    }
    const callbackSomethingElse = function(...givenParams) {
      calledSomethingElse++
      expect(givenParams).toEqual(params)
    }
    const subscriptionSomething = emitter.on('something', callbackSomething)
    const subscriptionSomethingElse = emitter.on('something', callbackSomethingElse)
    expect(calledSomething).toBe(0)
    expect(calledSomethingElse).toBe(0)
    await emitter.emitAll('something', ...(params = [{}, {}, {}, {}, {}]))
    expect(calledSomething).toBe(1)
    expect(calledSomethingElse).toBe(1)
    await emitter.emitAll('something', ...(params = [{}, {}, {}, {}, {}]))
    expect(calledSomething).toBe(2)
    expect(calledSomethingElse).toBe(2)
    await emitter.emitAll('something', ...(params = [{}, {}, {}, {}, {}]))
    expect(calledSomething).toBe(3)
    expect(calledSomethingElse).toBe(3)
    subscriptionSomething.dispose()
    await emitter.emitAll('something', ...(params = [{}, {}, {}, {}, {}]))
    expect(calledSomething).toBe(3)
    expect(calledSomethingElse).toBe(4)
    subscriptionSomethingElse.dispose()
    await emitter.emitAll('something', ...(params = [{}, {}, {}, {}, {}]))
    expect(calledSomething).toBe(3)
    expect(calledSomethingElse).toBe(4)
  })
  it('has a working clear method', async function() {
    let timesCalled = 0
    const emitter = getEmitter()
    emitter.on('something', function() {
      timesCalled++
    })
    expect(timesCalled).toBe(0)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(1)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(2)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(3)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    emitter.clear()
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    emitter.on('something', function() {
      timesCalled++
    })
    await emitter.emitAll('something')
    expect(timesCalled).toBe(5)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(6)
  })
  it('has a working dispose method', async function() {
    let timesCalled = 0
    const emitter = getEmitter()
    emitter.on('something', function() {
      timesCalled++
    })
    expect(timesCalled).toBe(0)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(1)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(2)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(3)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    emitter.dispose()
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    await emitter.emitAll('something')
    expect(timesCalled).toBe(4)
    expect(function() {
      emitter.on('something', function() {
        timesCalled++
      })
    }).toThrow('Emitter has been disposed')
  })
  it('plays well with multiple events', async function() {
    let timesACalled = 0
    let timesBCalled = 0

    const emitter = getEmitter()
    const subscriptionA1 = emitter.on('a', function() {
      timesACalled++
    })
    const subscriptionA2 = emitter.on('a', function() {
      timesACalled++
    })
    const subscriptionB1 = emitter.on('b', function() {
      timesBCalled++
    })
    const subscriptionB2 = emitter.on('b', function() {
      timesBCalled++
    })

    expect(timesACalled).toBe(0)
    expect(timesBCalled).toBe(0)
    await emitter.emitAll('a')
    expect(timesACalled).toBe(2)
    expect(timesBCalled).toBe(0)
    await emitter.emitAll('a')
    expect(timesACalled).toBe(4)
    expect(timesBCalled).toBe(0)
    subscriptionA2.dispose()
    await emitter.emitAll('a')
    expect(timesACalled).toBe(5)
    expect(timesBCalled).toBe(0)
    await emitter.emitAll('a')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(0)
    subscriptionA1.dispose()
    await emitter.emitAll('a')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(0)
    await emitter.emitAll('a')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(0)

    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(0)
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(2)
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(4)
    subscriptionB2.dispose()
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(5)
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(6)
    subscriptionB1.dispose()
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(6)
    await emitter.emitSome('b')
    expect(timesACalled).toBe(6)
    expect(timesBCalled).toBe(6)
  })
  it('supports async functions in emitAll', async function() {
    let timesCalled = 0
    const emitter = getEmitter()
    emitter.on('a', function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          timesCalled++
          resolve()
        }, 0)
      })
    })
    emitter.on('a', function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          timesCalled++
          resolve()
        }, 0)
      })
    })
    expect(timesCalled).toBe(0)
    const promise = emitter.emitAll('a')
    expect(timesCalled).toBe(0)
    await promise
    expect(timesCalled).toBe(2)
  })
  it('supports async functions in emitSome', async function() {
    let timesCalled = 0
    const emitter = getEmitter()
    emitter.on('a', function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          timesCalled++
          resolve()
        }, 0)
      })
    })
    emitter.on('a', function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          timesCalled++
          resolve()
        }, 0)
      })
    })
    expect(timesCalled).toBe(0)
    const promise = emitter.emitSome('a')
    expect(timesCalled).toBe(0)
    await promise
    expect(timesCalled).toBe(2)
  })
  describe('emitSome', function() {
    it('exits on first truthy value', async function() {
      const log = []
      const emitter = getEmitter()
      emitter.on('a', function() {
        log.push('first a')
        return false
      })
      emitter.on('a', function() {
        log.push('second a')
        return true
      })
      emitter.on('a', function() {
        log.push('third a')
        return true
      })

      await emitter.emitSome('a')
      expect(log).toEqual(['first a', 'second a'])
      log.length = 0

      emitter.on('b', function() {
        log.push('first b')
        return false
      })
      emitter.on('b', function() {
        log.push('second b')
        return false
      })
      emitter.on('b', function() {
        log.push('third b')
        return true
      })
      await emitter.emitSome('b')
      expect(log).toEqual(['first b', 'second b', 'third b'])
    })
    it('triggers them in series instead of parallel', async function() {
      const log = []
      const emitter = getEmitter()

      emitter.on('a', function() {
        log.push('first entered a')
        return wait(10).then(function() {
          log.push('first exited a')
        })
      })
      emitter.on('a', function() {
        log.push('second entered a')
        return wait(10).then(function() {
          log.push('second exited a')
        })
      })
      emitter.on('a', function() {
        log.push('third entered a')
        return wait(10).then(function() {
          log.push('third exited a')
        })
      })

      await emitter.emitSome('a')
      expect(log).toEqual(['first entered a', 'first exited a', 'second entered a', 'second exited a', 'third entered a', 'third exited a'])
    })
    it('returns the truthy resolved value', async function() {
      const emitter = getEmitter()

      emitter.on('a', function() {
        return false
      })
      emitter.on('a', function() {
        return 'hi'
      })

      expect(await emitter.emitSome('a')).toBe('hi')
    })
  })
  describe('emitAll', function() {
    it('does not exit on first truthy value', async function() {
      const log = []
      const emitter = getEmitter()
      emitter.on('a', function() {
        log.push('first a')
        return false
      })
      emitter.on('a', function() {
        log.push('second a')
        return true
      })
      emitter.on('a', function() {
        log.push('third a')
        return true
      })

      await emitter.emitAll('a')
      expect(log).toEqual(['first a', 'second a', 'third a'])
      log.length = 0

      emitter.on('b', function() {
        log.push('first b')
        return false
      })
      emitter.on('b', function() {
        log.push('second b')
        return false
      })
      emitter.on('b', function() {
        log.push('third b')
        return true
      })
      await emitter.emitAll('b')
      expect(log).toEqual(['first b', 'second b', 'third b'])
    })

    it('triggers them in series instead of parallel', async function() {
      const log = []
      const emitter = getEmitter()

      emitter.on('a', function() {
        log.push('first entered a')
        return wait(10).then(function() {
          log.push('first exited a')
        })
      })
      emitter.on('a', function() {
        log.push('second entered a')
        return wait(10).then(function() {
          log.push('second exited a')
        })
      })
      emitter.on('a', function() {
        log.push('third entered a')
        return wait(10).then(function() {
          log.push('third exited a')
        })
      })

      await emitter.emitAll('a')
      expect(log).toEqual(['first entered a', 'first exited a', 'second entered a', 'second exited a', 'third entered a', 'third exited a'])
    })

    it('does not return any value', async function() {
      const emitter = getEmitter()

      emitter.on('a', function() {
        return false
      })
      emitter.on('a', function() {
        return 'hi'
      })

      expect(await emitter.emitAll('a')).toBe(undefined)
    })
  })
})
