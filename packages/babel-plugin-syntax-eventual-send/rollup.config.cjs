const babelSource = require('../../scripts/rollup-plugin-babel-source');
const resolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');
const rollupJson = require("@rollup/plugin-json");

module.exports = [{
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
  plugins: [ babelSource(), resolve(), commonJs(), rollupJson()]
}, {
  input: 'src/index.js',
  output: {
    file: `dist/index.umd.js`,
    format: 'umd',
    name: 'BabelPluginSyntaxEventualSend',
  },
  plugins: [babelSource(), resolve(), commonJs(), rollupJson()],
}];
