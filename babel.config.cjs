const { parse } = require('@agoric/babel-parser');

const targetGlobal = process.env.TARGET_GLOBAL;
const opts = {};
if (targetGlobal) {
  opts.targetGlobal = targetGlobal;
}

module.exports = {
  "plugins": [
    {
      parserOverride(code, opts) {
        return parse(code, opts);
      }
    },
    ["proposal-eventual-send", opts],
  ],
};
