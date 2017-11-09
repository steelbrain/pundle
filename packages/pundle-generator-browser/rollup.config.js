// @flow

import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

const wrapper = process.env.PUNDLE_WRAPPER
if (!wrapper) {
  throw new Error('PUNDLE_WRAPPER env variable not specified')
}

export default {
  input: `wrappers/${wrapper}.js`,
  output: {
    format: 'iife',
    name: `__sbPundle_${wrapper}`,
    file: `wrappers/${wrapper}.built.js`,
  },
  strict: false,
  plugins: [
    uglify(),
    babel({
      exclude: ['node_modules/**', '*.built.js'],
      babelrc: false,
      presets: [
        [
          'babel-preset-steelbrain',
          {
            modules: false,
          },
        ],
      ],
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
