# Orthogonal Class Member Syntax
Proposed by Mark S. Miller (@erights) and Chip Morningstar (@FUDCo)

Additional text by Michael FIG (@michaelfig)

**ECMAScript Infix Bang Syntax: Support for chaining Promises**
## Summary
Since the inception of Promises in Javascript, they were planned to provide a convenient means to program distributed systems.  This paradigm had several previous implementations, but was most directly descended from Promises in our [E language](http://erights.org/).  An early [ECMAScript strawman concurrency proposal](https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency) describes a simple desugaring of an infix bang (*!*) operator to allow chaining of *Promise* operations.  While Promises have achieved widespread popularity and now have language support (via *async*/*await*), the original intent for deadlock-free distributed concurrent programming in ECMAScript has languished.

This proposal introduces the infix bang syntax, with simple semantics integrated with extensions to the *Promise* API that are in line with modern ECMAScript.  Additionally, we explain the notion of a *handled Promise*, which extends a given *Promise* to implement different infix bang protocols in ECMAScript code.

## Details

In contrast to *async*/*await*, infix bang is designed to allow the convenient chaining of *Promises* without interrupting evaluation.  The specific mechanism used by infix bang allows us to implement remote network protocols taking advantage of *Promise Pipelining*

### Infix Bang

TODO: Is bang inspired by the combination of a dot with a pipe?

| Abstract Syntax	| Expansion	| Simple Case	| Expansion	| JSON/RESTful equiv |
|------- | --- | --- | --- | --- |
| `x ! [i](y, z)`	| `Promise.resolve(x).post(i, [y, z])`	| `x ! p(y, z)` |	`Promise.resolve(x).post('p', [y, z])`	| `POST https://...q=p {...}` |
| `x ! (y, z)`	 | `Promise.resolve(x).post(undefined, [y, z])`	| -	 | - |	`POST https://... {...}` |
| `x ! [i]`	| `Promise.resolve(x).get(i)` |	`x ! p`	| `Promise.resolve(x).get('p')` |	`GET https://...q=p` |
| `x ! [i] = v`	| `Promise.resolve(x).put(i, v)` |	`x ! p = v`	| `Promise.resolve(x).put('p', v)` | `PUT https://...q=p {...}` |
| `delete x ! [i]` |	`Promise.resolve(x).delete(i)` | `delete x ! p`	| `Promise.resolve(x).delete('p')`	| `DELETE https://...q=p` |

### Default meaning

In the absence of *handled Promises* (the **Handler Method** is described in the next section), the above *Promise.prototype* methods have the following behaviour:

| Method | Definition | Handler Method |
| --- | --- | --- |
| p.post(undefined, args) | p.then(o => o(...args)) | h.POST(o, undefined, args) |
| p.post(prop, args) | p.then(o => o\[prop](...args)) | h.POST(o, prop, args) |
| p.get(prop) | p.then(o => o\[prop]) | h.GET(o, prop) |
| p.put(prop, value) | p.then(o => (o\[prop] = value)) | h.PUT(o, prop, value) |
| p.delete(prop) | p.then(o => delete o\[prop]) | h.DELETE(o, prop) |

### Handled Promises

In a manner analogous to *Proxy* handlers, a *Promise* can be associated with a handler object that provides **Handler Methods** to override its normal unhandled behaviour.  A *handled Promise* is constructed via *Promise.makeHandled()*:

```js
const handler = {
  GET(o, prop) { ... },
  POST(o, prop, args) { ... },
  PUT(o, prop, value) { ... },
  DELETE(o, prop) { ... },
};

const executor = (resolve, reject) => {
  // Resolve the promise with target and use the default behaviour.
  resolve(target);
  // Resolve the promise with target and associate fulfilledHandler with it.
  resolve(target, fulfilledHandler); 
};

// Create a Promise resolving to a target, whose handler queues
// operations that are replayed when the executor fulfills it.
const targetP = Promise.makeHandled(executor);

// Create a Promise resolving to a target, whose handler is
// unfulfilledHandler until the executor fulfills it.
const targetP = Promise.makeHandled(executor, unfulfilledHandler);
```

The default resolve behaviour is to use the same handler that is assigned to `target`, and if there is none, use the default *Promise* behaviour.

#### Promise Pipelining

TODO: Explain the mechanism, and how it would be done by coordinating unfulfilledHandler with fulfilledHandler.

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

You can experiment with the infix bang syntax desugaring in the [Infix Bang REPL](https://babeljs.io/repl/build/11009/?externalPlugins=babel-plugin-syntax-infix-bang).

The following code fragments are useful for elucidation:

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

It is worth noting that TypeScript has introduced postfix bang as a non-null assertion operator, which conflicts with our proposed usage (`x![a]` means assert `x` is not null, then return the `a` property).
