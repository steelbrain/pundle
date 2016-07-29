/* @flow */

import * as Helpers from '../src'

describe('Helpers', function() {
  describe('matchesRules & shouldProcess', function() {
    describe('exclude prop', function() {
      it('only passes if the props are all declined by the file path', function() {
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: [/\.js$/],
        })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: [/\.jss$/],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: [],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: ['test.js'],
        })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: ['.js'],
        })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: ['.coffee'],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          exclude: ['test.coffee'],
        })).toBe(true)
      })
    })
    describe('include prop', function() {
      it('only passes if the props are all passed by the file path', function() {
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: [/\.js$/],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: [/\.jss$/],
        })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.coffee', {
          extensions: [],
          include: [/\.js$/, /\.coffee$/],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.coffee', {
          extensions: [],
          include: [/\.js$/, '.coffee'],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: ['.js'],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: ['.jss'],
        })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: ['test.js'],
        })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', {
          extensions: [],
          include: ['test2.js'],
        })).toBe(false)
        expect(Helpers.shouldProcess('/src', '/src/app/test.js', {
          extensions: [],
          include: ['./src'],
        })).toBe(false)
        expect(Helpers.shouldProcess('/src', '/src/app/test.js', {
          extensions: [],
          include: ['/src'],
        })).toBe(true)
        expect(Helpers.shouldProcess('/src', '/src/app/test.js', {
          extensions: [],
          include: ['./app2'],
        })).toBe(false)
        expect(Helpers.shouldProcess('/src', '/src/app/test.js', {
          extensions: [],
          include: ['./app'],
        })).toBe(true)
        expect(Helpers.shouldProcess('/src2', '/src/app/test.js', {
          extensions: [],
          include: ['./app'],
        })).toBe(false)
        expect(Helpers.shouldProcess('/src2', '/src/app/test.js', {
          extensions: [],
          include: ['/src/app/test.js'],
        })).toBe(true)
        expect(Helpers.shouldProcess('/src2', '/src/app/.eslintrc.json', {
          extensions: [],
          include: ['.json'],
        })).toBe(true)
      })
    })
    describe('extensions prop', function() {
      it('only passes if the extension is in the prop', function() {
        expect(Helpers.shouldProcess('', 'test.js', { extensions: ['.js'] })).toBe(true)
        expect(Helpers.shouldProcess('', 'test.js', { extensions: ['.jss'] })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.jss', { extensions: ['.js'] })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', { extensions: [] })).toBe(false)
        expect(Helpers.shouldProcess('', 'test.js', { extensions: [''] })).toBe(false)
      })
    })
  })
})
