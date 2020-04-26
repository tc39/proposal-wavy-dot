const babelSource = require('../../scripts/rollup-plugin-babel-source');

module.exports = {
  input: 'src/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
  plugins: [ babelSource() ]
};
