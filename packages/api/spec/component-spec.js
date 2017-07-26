/* @flow */

import { it } from 'jasmine-fix'
import * as Components from '../src/components'

describe('Components', function() {
  describe('createLoader', function() {
    function makeRequest(a: any, b: any) {
      return Components.createLoader(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('loader')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createPlugin', function() {
    function makeRequest(a: any, b: any) {
      return Components.createPlugin(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('plugin')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createResolver', function() {
    function makeRequest(a: any, b: any, c: any): any {
      return Components.createResolver(a, b, c)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('resolver')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createReporter', function() {
    function makeRequest(a: any, b: any) {
      return Components.createReporter(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('reporter')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createGenerator', function() {
    function makeRequest(a: any, b: any) {
      return Components.createGenerator(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('generator')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createTransformer', function() {
    function makeRequest(a: any, b: any) {
      return Components.createTransformer(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('transformer')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
  describe('createPostTransformer', function() {
    function makeRequest(a: any, b: any) {
      return Components.createPostTransformer(a, b)
    }

    it('throws an error if parameter 1 is not a function', function() {
      expect(function() {
        makeRequest(null, {})
      }).toThrow('Parameter 1 must be a function or config object')
      expect(function() {
        makeRequest({}, {})
      }).toThrow('config.callback must be a function')
      expect(function() {
        makeRequest(false, {})
      }).toThrow('Parameter 1 must be a function or config object')
    })
    it('throws an error if parameter 2 is not an object', function() {
      expect(function() {
        makeRequest(function() {}, null)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, false)
      }).toThrow('Parameter 2 must be an object')
      expect(function() {
        makeRequest(function() {}, true)
      }).toThrow('Parameter 2 must be an object')
    })
    it('returns expected results if both parameters are correct', function() {
      const callback = function() { }
      const defaultConfig = {}
      const value = makeRequest(callback, defaultConfig)
      expect(value.$type).toBe('post-transformer')
      expect(value.callback).toBe(callback)
      expect(value.defaultConfig).toBe(defaultConfig)
    })
  })
})
