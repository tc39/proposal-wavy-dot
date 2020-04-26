const babelSource = require('../../scripts/rollup-plugin-babel-source');
const resolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');
const rollupNodeGlobals = require('rollup-plugin-node-globals');
const rollupNodeBuiltins = require('rollup-plugin-node-builtins');
const rollupJson = require("@rollup/plugin-json");

module.exports = [{
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
  plugins: [babelSource(), resolve(), commonJs(), rollupJson(), rollupNodeBuiltins(), rollupNodeGlobals()],
}, {
  input: 'src/index.js',
  output: {
    file: `dist/index.umd.js`,
    format: 'umd',
    name: 'BabelPluginProposalEventualSend',
  },
  plugins: [babelSource(), resolve(), commonJs(), rollupJson(), rollupNodeBuiltins(), rollupNodeGlobals()],
}];
