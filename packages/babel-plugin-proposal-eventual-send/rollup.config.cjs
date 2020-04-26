const babelSource = require('../../scripts/rollup-plugin-babel-source');
const resolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');

module.exports = [{
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
  plugins: [ babelSource(), resolve(), commonJs()]
}, {
  input: 'src/index.js',
  output: {
    file: `dist/index.umd.js`,
    format: 'umd',
    name: 'BabelPluginProposalEventualSend',
  },
  plugins: [babelSource(), resolve(), commonJs()],
}];
