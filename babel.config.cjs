const { parse } = require('@agoric/babel-parser');

const targetGlobal = process.env.TARGET_GLOBAL || 'HandledPromise';

module.exports = {
  "plugins": [
    {
      parserOverride(code, opts) {
        return parse(code, opts);
      }
    },
    ["proposal-eventual-send", { targetGlobal }],
  ],
};
