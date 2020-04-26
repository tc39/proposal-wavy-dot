'use strict';

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');

var syntaxEventualSend = helperPluginUtils.declare(api => {
  api.assertVersion(7);

  return {
    name: "syntax-eventual-send",

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("eventualSend");
    },
  };
});

function makeVisitor(targetGlobal = 'HandledPromise') {
  return {
    EventualMemberExpression(path) {
      const { node } = path;
      if (path.parent.type === 'CallExpression') {
        // Allow rewriting call expressions to eventualCalls.
        return;
      }
      const { object, computed, property } = node;

      let targetMember;
      switch (targetGlobal) {
        case 'Promise':
          targetMember = core.types.identifier('eventualGet');
          break;
        case 'HandledPromise':
          targetMember = core.types.identifier('get');
          break;
          // FIXME: What to do?
      }

      const target = core.types.memberExpression(core.types.identifier(targetGlobal), targetMember);

      const targs = [];
      targs.push(object);
      if (computed) {
        // Just use the computed property.
        targs.push(property);
      } else {
        // Make a literal from the name.
        targs.push(core.types.stringLiteral(property.name));
      }

      path.replaceWith(core.types.callExpression(target, targs));
    },
    CallExpression(path) {
      const { node } = path;
      const { callee, arguments: args } = node;
      const { type, object, computed, property } = callee;
      if (type !== 'EventualMemberExpression') {
        return;
      }

      let targetMember;
      switch (targetGlobal) {
        case 'Promise':
          targetMember = core.types.identifier('eventualSend');
          break;
        case 'HandledPromise':
          targetMember = core.types.identifier('applyMethod');
          break;
          // FIXME: What to do?
      }

      const target = core.types.memberExpression(core.types.identifier(targetGlobal), targetMember);

      // The arguments to our target.
      const targs = [];
      targs.push(object);
      if (computed) {
        // Just use the computed property.
        targs.push(property);
      } else {
        // Make a literal from the name.
        targs.push(core.types.stringLiteral(property.name));
      }
      // Add the method arguments.
      targs.push(core.types.arrayExpression(args));

      path.replaceWith(core.types.callExpression(target, targs));
    },
    EventualCallExpression(path) {
      const { node } = path;
      const { callee, arguments: args } = node;

      let targetMember;
      switch (targetGlobal) {
        case 'Promise':
          targetMember = core.types.identifier('eventualApply');
          break;
        case 'HandledPromise':
          targetMember = core.types.identifier('applyFunction');
          break;
          // FIXME: What to do?
      }

      const target = core.types.memberExpression(core.types.identifier(targetGlobal), targetMember);

      const targs = [];
      targs.push(callee);
      targs.push(core.types.arrayExpression(args));

      path.replaceWith(core.types.callExpression(target, targs));
    },
  };
}

const targetGlobals = ['Promise', 'HandledPromise'];

var index = helperPluginUtils.declare((api, options) => {
  api.assertVersion(7);
  const { targetGlobal } = options;

  if (typeof targetGlobal !== "string" || !targetGlobals.includes(targetGlobal)) {
    throw new Error(
      "The eventual send plugin requires a 'targetGlobal' option." +
        "'targetGlobal' must be one of: " +
        targetGlobals.join(", ") +
        ".",
    );
  }

  return {
    name: "proposal-eventual-send",
    inherits: syntaxEventualSend,
    visitor: makeVisitor(targetGlobal),
  };
});

module.exports = index;
