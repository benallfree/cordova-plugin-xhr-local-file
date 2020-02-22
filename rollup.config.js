import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.js',
  output: {
    file: 'www/xhr-polyfill.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [resolve(), commonjs()]
}
