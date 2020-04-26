'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var lib = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.declare = declare;

function declare(builder) {
  return (api, options, dirname) => {
    if (!api.assertVersion) {
      api = Object.assign(copyApiObject(api), {
        assertVersion(range) {
          throwVersionError(range, api.version);
        }

      });
    }

    return builder(api, options || {}, dirname);
  };
}

function copyApiObject(api) {
  let proto = null;

  if (typeof api.version === "string" && /^7\./.test(api.version)) {
    proto = Object.getPrototypeOf(api);

    if (proto && (!has(proto, "version") || !has(proto, "transform") || !has(proto, "template") || !has(proto, "types"))) {
      proto = null;
    }
  }

  return Object.assign({}, proto, {}, api);
}

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function throwVersionError(range, version) {
  if (typeof range === "number") {
    if (!Number.isInteger(range)) {
      throw new Error("Expected string or integer value.");
    }

    range = `^${range}.0.0-0`;
  }

  if (typeof range !== "string") {
    throw new Error("Expected string or integer value.");
  }

  const limit = Error.stackTraceLimit;

  if (typeof limit === "number" && limit < 25) {
    Error.stackTraceLimit = 25;
  }

  let err;

  if (version.slice(0, 2) === "7.") {
    err = new Error(`Requires Babel "^7.0.0-beta.41", but was loaded with "${version}". ` + `You'll need to update your @babel/core version.`);
  } else {
    err = new Error(`Requires Babel "${range}", but was loaded with "${version}". ` + `If you are sure you have a compatible version of @babel/core, ` + `it is likely that something in your build process is loading the ` + `wrong version. Inspect the stack trace of this error to look for ` + `the first entry that doesn't mention "@babel/core" or "babel-core" ` + `to see what is calling Babel.`);
  }

  if (typeof limit === "number") {
    Error.stackTraceLimit = limit;
  }

  throw Object.assign(err, {
    code: "BABEL_VERSION_UNSUPPORTED",
    version,
    range
  });
}
});

unwrapExports(lib);
var lib_1 = lib.declare;

var index_umd = createCommonjsModule(function (module, exports) {
(function (global, factory) {
	 module.exports = factory() ;
}(commonjsGlobal, (function () {
	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var lib = createCommonjsModule(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.declare = declare;

	function declare(builder) {
	  return (api, options, dirname) => {
	    if (!api.assertVersion) {
	      api = Object.assign(copyApiObject(api), {
	        assertVersion(range) {
	          throwVersionError(range, api.version);
	        }

	      });
	    }

	    return builder(api, options || {}, dirname);
	  };
	}

	function copyApiObject(api) {
	  let proto = null;

	  if (typeof api.version === "string" && /^7\./.test(api.version)) {
	    proto = Object.getPrototypeOf(api);

	    if (proto && (!has(proto, "version") || !has(proto, "transform") || !has(proto, "template") || !has(proto, "types"))) {
	      proto = null;
	    }
	  }

	  return Object.assign({}, proto, {}, api);
	}

	function has(obj, key) {
	  return Object.prototype.hasOwnProperty.call(obj, key);
	}

	function throwVersionError(range, version) {
	  if (typeof range === "number") {
	    if (!Number.isInteger(range)) {
	      throw new Error("Expected string or integer value.");
	    }

	    range = `^${range}.0.0-0`;
	  }

	  if (typeof range !== "string") {
	    throw new Error("Expected string or integer value.");
	  }

	  const limit = Error.stackTraceLimit;

	  if (typeof limit === "number" && limit < 25) {
	    Error.stackTraceLimit = 25;
	  }

	  let err;

	  if (version.slice(0, 2) === "7.") {
	    err = new Error(`Requires Babel "^7.0.0-beta.41", but was loaded with "${version}". ` + `You'll need to update your @babel/core version.`);
	  } else {
	    err = new Error(`Requires Babel "${range}", but was loaded with "${version}". ` + `If you are sure you have a compatible version of @babel/core, ` + `it is likely that something in your build process is loading the ` + `wrong version. Inspect the stack trace of this error to look for ` + `the first entry that doesn't mention "@babel/core" or "babel-core" ` + `to see what is calling Babel.`);
	  }

	  if (typeof limit === "number") {
	    Error.stackTraceLimit = limit;
	  }

	  throw Object.assign(err, {
	    code: "BABEL_VERSION_UNSUPPORTED",
	    version,
	    range
	  });
	}
	});

	unwrapExports(lib);
	var lib_1 = lib.declare;

	var index = lib_1(api => {
	  api.assertVersion(7);

	  return {
	    name: "syntax-eventual-send",

	    manipulateOptions(opts, parserOpts) {
	      parserOpts.plugins.push("eventualSend");
	    },
	  };
	});

	return index;

})));
});

var syntaxEventualSend = unwrapExports(index_umd);

function makeVisitor(t, targetGlobal = 'HandledPromise') {
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
          targetMember = t.identifier('eventualGet');
          break;
        case 'HandledPromise':
          targetMember = t.identifier('get');
          break;
          // FIXME: What to do?
      }

      const target = t.memberExpression(t.identifier(targetGlobal), targetMember);

      const targs = [];
      targs.push(object);
      if (computed) {
        // Just use the computed property.
        targs.push(property);
      } else {
        // Make a literal from the name.
        targs.push(t.stringLiteral(property.name));
      }

      path.replaceWith(t.callExpression(target, targs));
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
          targetMember = t.identifier('eventualSend');
          break;
        case 'HandledPromise':
          targetMember = t.identifier('applyMethod');
          break;
          // FIXME: What to do?
      }

      const target = t.memberExpression(t.identifier(targetGlobal), targetMember);

      // The arguments to our target.
      const targs = [];
      targs.push(object);
      if (computed) {
        // Just use the computed property.
        targs.push(property);
      } else {
        // Make a literal from the name.
        targs.push(t.stringLiteral(property.name));
      }
      // Add the method arguments.
      targs.push(t.arrayExpression(args));

      path.replaceWith(t.callExpression(target, targs));
    },
    EventualCallExpression(path) {
      const { node } = path;
      const { callee, arguments: args } = node;

      let targetMember;
      switch (targetGlobal) {
        case 'Promise':
          targetMember = t.identifier('eventualApply');
          break;
        case 'HandledPromise':
          targetMember = t.identifier('applyFunction');
          break;
          // FIXME: What to do?
      }

      const target = t.memberExpression(t.identifier(targetGlobal), targetMember);

      const targs = [];
      targs.push(callee);
      targs.push(t.arrayExpression(args));

      path.replaceWith(t.callExpression(target, targs));
    },
  };
}

const DEFAULT_TARGET_GLOBAL = 'HandledPromise';
const targetGlobals = ['Promise', 'HandledPromise'];

var index = lib_1((api, options) => {
  const { types } = api;
  api.assertVersion(7);
  const { targetGlobal = DEFAULT_TARGET_GLOBAL } = options;

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
    visitor: makeVisitor(types, targetGlobal),
  };
});

module.exports = index;
