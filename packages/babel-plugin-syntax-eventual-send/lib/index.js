'use strict';

var helperPluginUtils = require('@babel/helper-plugin-utils');

var index = helperPluginUtils.declare(api => {
  api.assertVersion(7);

  return {
    name: "syntax-eventual-send",

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("eventualSend");
    },
  };
});

module.exports = index;
