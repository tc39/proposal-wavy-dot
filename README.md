# ECMAScript Infix Bang Syntax: Support for chaining Promises
By Mark S. Miller (@erights), Chip Morningstar (@FUDCo), and Michael FIG (@michaelfig)

**ECMAScript Infix Bang Syntax: Support for chaining Promises**
## Summary
Since the inception of Promises in Javascript, they were planned to provide a convenient means to program distributed systems.  This paradigm had several previous implementations, but was most directly descended from Promises in our [E language](http://erights.org/).  An early [ECMAScript strawman concurrency proposal](https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency) describes a simple desugaring of an infix bang (*!*) operator to allow chaining of *Promise* operations.  While Promises have achieved widespread popularity and now have language support (via *async*/*await*), the original intent for deadlock-free distributed concurrent programming in ECMAScript has languished.

This proposal introduces the infix bang syntax, with simple semantics integrated with extensions to the *Promise* API that are in line with modern ECMAScript.  Additionally, we explain the notion of a *handled Promise*, which extends a given *Promise* to implement different infix bang protocols in ECMAScript code.

## Details

In contrast to *async*/*await*, infix bang is designed to allow the convenient chaining of *Promises* without interrupting evaluation.  The specific mechanism used by infix bang allows us to implement remote network protocols taking advantage of *Promise Pipelining*

### Infix Bang

Infix bang (*!*) is a proposed operator with the same precedence as dot (*.*), but cannot begin a new line so that automatic semicolon insertion does not change the interpretation of existing code that has prefix bangs in it without semicolons.

| Syntax	| Expansion	|
|------- | --- |
| `x ! [i](y, z)`	| `Promise.resolve(x).post(i, [y, z])`	|
| `x ! p(y, z)` |	`Promise.resolve(x).post('p', [y, z])`	|
| `x ! (y, z)`	 | `Promise.resolve(x).post(void 0, [y, z])`	|
| `x ! [i]`	| `Promise.resolve(x).get(i)` |
|	`x ! p`	| `Promise.resolve(x).get('p')` |
| `x ! [i] = v`	| `Promise.resolve(x).put(i, v)` |
| `x ! p = v`	| `Promise.resolve(x).put('p', v)` |
| `delete x ! [i]` |	`Promise.resolve(x).delete(i)` |
| `delete x ! p`	| `Promise.resolve(x).delete('p')`	|

### Default Behaviour

In the absence of *handled Promises* (the **Handler Method** is described in the next section), the above *Promise.prototype* methods have the following behaviour:

| Method | Default Behaviour | Handler Method |
| --- | --- | --- |
| `p.post(void 0, args)` | `p.then(o => o(...args))` | `h.POST(o, void 0, args)` |
| `p.post(prop, args)` | `p.then(o => o[prop](...args))` | `h.POST(o, prop, args)` |
| `p.get(prop)` | `p.then(o => o[prop])` | `h.GET(o, prop)` |
| `p.put(prop, value)` | `p.then(o => (o[prop] = value))` | `h.PUT(o, prop, value)` |
| `p.delete(prop)` | `p.then(o => delete o[prop])` | `h.DELETE(o, prop)` |

### Handled Promises

In a manner analogous to *Proxy* handlers, a *Promise* can be associated with a handler object that provides **Handler Methods** to override its normal unhandled behaviour.  This handler is not exposed to the user of the *handled Promise*, so it provides a barrier between user mode (where the infix bang syntax is used) and system mode (which implements the communication mechanism).

A *handled Promise* is constructed via *Promise.makeHandled()*:

```js
//////////////////////
// Create a handled Promise, whose behaviour queues messages
// until resolve is called below.

const executorDefault = (resolve, reject) => {
  // Resolve the promise with target and use the default behaviour.
  setTimeout(() => resolve('some value'), 3000);
};

const targetP = Promise.makeHandled(executorDefault);

// These methods can run anytime before or after the targetP is fulfilled.
// The default handler for makeHandled queues the messages until the fulfill.
targetP.then(val => assert(val === 'some value'));
targetP!length.then(len => assert(len === 10));
targetP!concat(' foobar').then(val => assert(val === 'some value foobar'));

///////////////////////
// Create a handled Promise that queues messages for a remote slot.
const handler = {
  GET(o, prop) {
    return (...args) => queueMessage(slot, prop, args);
  },
  POST(o, prop, args) {
    return queueMessage(slot, prop, args);
  },
  PUT(o, prop, value) { ... },
  DELETE(o, prop) { ... },
};

const executorFulfilled = (resolve, reject) => {
  setTimeout(() => resolve(target, handler), 1000);
  // Resolve the promise with target and associate handler with it.
};

const targetP = Promise.makeHandled(executorFulfilled, handler);

targetP!foo(a, b, c) // results in: queueMessage(slot, 'foo', [a, b, c]);
targetP!foo!(a, b, c) // same
```

If the *handler* (second argument) is not specified to `resolve`, the handler is the same one that has previously been assigned to `target`, or else as described in the **Default Behaviour** section.

#### Promise Pipelining

The [Promise pipelining](http://www.erights.org/elib/distrib/pipeline.html) mechanism allows enqueuing messages and immediately returning references that correspond to their results, without a network round trip.  *Handled Promises* are designed specifically to allow transparent implementation of this mechanism.

### Proposed Syntax

TODO: Rewrite in the standard way.

Abstract Syntax:

```
 Expression : ...
      Expression ! [ Expression ] Arguments    // eventual send
      Expression ! Arguments                   // eventual call
      Expression ! [ Expression ]              // eventual get
      Expression ! [ Expression ] = Expression // eventual put
      delete Expression ! [ Expression ]       // eventual delete
```

Attempted Concrete Syntax:

```
  MemberExpression : ...
      MemberExpression [nlth] ! [ Expression ]
      MemberExpression [nlth] ! IdentifierName
  CallExpression : ...
      CallExpression [nlth] ! [ Expression ] Arguments
      CallExpression [nlth] ! IdentifierName Arguments
      MemberExpression [nlth] ! Arguments
      CallExpression [nlth] ! Arguments
      CallExpression [nlth] ! [ Expression ]
      CallExpression [nlth] ! IdentifierName
  UnaryExpression : ...
      delete CallExpression [nlth] ! [ Expression ]
      delete CallExpression [nlth] ! IdentifierName
  LeftHandSideExpression :
      Identifier
      CallExpression [ Expression ]
      CallExpression . IdentifierName
      CallExpression [nlth] ! [ Expression ]
      CallExpression [nlth] ! IdentifierName
```

“[nlth]” above is short for “[No LineTerminator here]“, in order to unambiguously distinguish infix from prefix bang in the face of automatic semicolon insertion.

## Implementation

There is a [shim for the proposed *Promise* API additions](https://github.com/Agoric/eventual-send).

You can experiment with the infix bang syntax desugaring in the [Infix Bang REPL](https://babeljs.io/repl/build/11009/?externalPlugins=babel-plugin-syntax-infix-bang).  The following code fragments can be used as input:

```
x ! p(y, z, q)
x![i](y, z)
x!(y, z)
x!()
x!p
x![i]
x!p = v
x![i] = v
delete x!p
delete x![i]

x!
  p
// No automatic semicolon insertion.

x  
  /* foo */ !p
// Automatic semicolon insertion.
```

## Caveats

To fully implement promise pipelining requires more support from the *handled Promises* API.  We will require at least one new hook to notify the handler when a *Promise* resolves to another *Promise* for forwarding messages, but this change can be introduced in a later stage of this proposal while maintaining backward compatibility.

It is worth noting that TypeScript has introduced postfix bang as a [non-null assertion operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator), which conflicts with our proposed usage (`x![i]` tells the type system that `x` is not null, then evaluates to `x[i]`).
