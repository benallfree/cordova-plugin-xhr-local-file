import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: './tstmp/index.js',
  output: {
    file: 'build/xhr-polyfill.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [commonjs(), resolve()]
}
