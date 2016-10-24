/* @flow */

import * as Helpers from '../src'

describe('rules', function() {
  describe('matchesRules', function() {
    describe('works with regexes', function() {
      it('handles regexes with file paths', function() {
        expect(Helpers.matchesRules('a/tmp/test.js', [/\w+.js$/])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.coffee', [/\w+.js$/])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.coffee', [/\w+.js$/, /\w+.coffee$/])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.chai', [/\w+.js$/, /\w+.coffee$/])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.js', [/test.js$/, /\w+.coffee$/])).toBe(true)
      })
      it('handles regexes with full paths', function() {
        expect(Helpers.matchesRules('a/tmp/test.js', [/\/tmp\/\w+.js$/])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.coffee', [/\/tmp\/\w+.js$/])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.coffee', [/\/tmp\/\w+.js$/, /\w+.coffee$/])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.chai', [/\/tmp\/\w+.js/, /\w+.coffee$/])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.js', [/\/tmp\/test.js$/, /\w+.coffee$/])).toBe(true)
      })
    })
    describe('works with globs', function() {
      it('handles globs with file paths', function() {
        expect(Helpers.matchesRules('a/tmp/test.js', ['*.js'])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.coffee', ['*.js'])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.coffee', ['*.js', '*.coffee'])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.chai', ['*.js', '*.coffee'])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.js', ['*.js', '*.coffee'])).toBe(true)
      })
      it('handles globs with full paths', function() {
        expect(Helpers.matchesRules('a/tmp/test.js', ['a/tmp/*.js'])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.coffee', ['a/tmp/*.js'])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.coffee', ['a/tmp/*.js', 'a/tmp/*.coffee'])).toBe(true)
        expect(Helpers.matchesRules('a/tmp/test.chai', ['a/tmp/*.js', 'a/tmp/*.coffee'])).toBe(false)
        expect(Helpers.matchesRules('a/tmp/test.js', ['a/tmp/*.js', 'a/tmp/*.coffee'])).toBe(true)
      })
    })
  })
  describe('shouldProcess', function() {
    it('rejects everything if neither include nor exclude is present', function() {
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {})).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {})).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.chai', {})).toBe(false)
    })
    it('works with single include', function() {
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        include: '*.js',
      })).toBe(true)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        include: '*.coffee',
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        include: '*.chai',
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        include: '*.js',
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        include: '*.coffee',
      })).toBe(true)

      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        include: '*.chai',
      })).toBe(false)
    })
    it('works with multiple includes', function() {
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        include: ['*.js', '*.coffee'],
      })).toBe(true)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        include: ['*.js', '*.coffee'],
      })).toBe(true)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.chai', {
        include: ['*.js', '*.coffee'],
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        include: ['*.chai', '*.coffee'],
      })).toBe(false)
    })
    it('works with single exclude', function() {
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        exclude: '*.chai',
      })).toBe(true)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        exclude: '*.js',
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.chai', {
        exclude: '*.chai',
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.chai', {
        exclude: '*.js',
      })).toBe(true)
    })
    it('works with multiple excludes', function() {
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.js', {
        exclude: ['*.chai', '*.coffee'],
      })).toBe(true)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.chai', {
        exclude: ['*.chai', '*.coffee'],
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        exclude: ['*.chai', '*.coffee'],
      })).toBe(false)
      expect(Helpers.shouldProcess('/a', '/a/tmp/test.coffee', {
        exclude: ['*.js', '*.chai'],
      })).toBe(true)
    })
  })
})
