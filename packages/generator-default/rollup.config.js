/* @flow */

import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

const wrapper = process.env.PUNDLE_WRAPPER
if (!wrapper) {
  throw new Error('PUNDLE_WRAPPER env variable not specified')
}

export default {
  entry: `wrappers/${wrapper}.js`,
  dest: `wrappers/dist/${wrapper}.js`,
  format: 'iife',
  moduleName: `__sbPundle_${wrapper}`,
  plugins: [
    uglify(),
    babel({
      exclude: 'node_modules/**',
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      sourceMap: false,
    }),
  ],
}
