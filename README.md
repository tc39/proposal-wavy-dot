# ECMAScript Infix Bang Syntax: Support for chaining Promises
By Mark S. Miller (@erights), Chip Morningstar (@FUDCo), and Michael FIG (@michaelfig)

**ECMAScript Infix Bang Syntax: Support for chaining Promises**
## Summary
Promises in Javascript were proposed in 2011 at the [ECMAScript strawman
concurrency
proposal](https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency).
These promises descend from the [E language](http://erights.org/) via
the [Waterken Q library](http://waterken.sourceforge.net/web_send/)
and [Kris Kowal's Q library](https://github.com/kriskowal/q). A good
early presentation is Tom Van Cutsem's [Communicating Event Loops: An
exploration in
Javascript](http://soft.vub.ac.be/~tvcutsem/talks/presentations/WGLD_CommEventLoops.pdf). All
of these are about promises as a first step towards distributed
computing, by using promises as asynchronous references to remote
objects.

Kris Kowal's [Q-connection
library](https://github.com/kriskowal/q-connection) extended Q's
promises for distributed computing, essentially in the way we have in
mind. However, in the absence of platform support for [Weak
References](https://github.com/tc39/proposal-weakrefs), this approach
was not practical. Given weak references, the [Midori
project](http://joeduffyblog.com/2015/11/19/asynchronous-everything/),
among others, demonstrates that this approach to distributed computing
works well at scale.

The old [ECMAScript strawman concurrency
proposal](https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency)
also described a simple desugaring of an infix bang (*!*) operator to
allow chaining of remote-able promise operations. This proposal
reintroduces the infix bang syntax, with simple semantics integrated
with extensions to the `Promise` API.  We explain the notion of a
*handled Promise*, which extends a given `Promise` to implement
different infix bang behaviors. These mechanisms, together with weak
references, enable writing remote object communications systems, but
they are not specific to any one. This proposal does not include any
specific usage of the mechanisms we propose, except as a motivating
example and test of adequacy.

## Details

In contrast to *async*/*await*, infix bang is designed to allow the convenient chaining of *Promises* without interrupting evaluation.  The specific mechanism used by infix bang allows us to implement remote network protocols taking advantage of *Promise Pipelining*.

### Infix Bang

Infix bang (*!*) is a proposed operator with the same precedence as dot (*.*), but cannot begin a new line so that automatic semicolon insertion does not change the interpretation of existing code that has prefix bangs (the *not* operator) in it without semicolons.

The **Synchronous Syntax** column describes the analogous synchronous operation on plain objects, while the **Eventual Syntax** introduces the proposed *Promise*-based eventual operations.
The *Promise.prototype* API additions needed for each **Eventual Expansion** are explained in the following section.

| Synchronous Syntax | Eventual Syntax	| Eventual Expansion	|
|------- | --- | --- |
| `x[i](y, z)` | `x![i](y, z)`	| `Promise.resolve(x).post(i, [y, z])`	|
| `x.p(y, z)` | `x!p(y, z)` |	`Promise.resolve(x).post('p', [y, z])`	|
| `x(y, z)` | `x!(y, z)`	 | `Promise.resolve(x).post(undefined, [y, z])`	|
| `x[i]` | `x![i]`	| `Promise.resolve(x).get(i)` |
|	`x.p` | `x!p`	| `Promise.resolve(x).get('p')` |
| `x[i] = v` | `x![i] = v`	| `Promise.resolve(x).put(i, v)` |
| `x.p = v` | `x!p = v`	| `Promise.resolve(x).put('p', v)` |
| `delete x[i]` | `delete x![i]` |	`Promise.resolve(x).delete(i)` |
| `delete x.p` | `delete x!p`	| `Promise.resolve(x).delete('p')`	|

### Default Behaviour

The proposed *Promise.prototype* API additions have the following behaviour.  In the examples below, `p` is a *Promise* and `t` is the resolution of that *Promise*.  The **Default Behaviour** implements the same basic effect as the **Synchronous** column in the previous section, but operates on a *Promise*.  The **Handled Behaviour** is described in the next section:

| Method | Unhandled Behaviour | Handled Behaviour |
| --- | --- | --- |
| `p.post(undefined, args)` | `p.then(t => t(...args))` | `h.POST(t, undefined, args)` |
| `p.post(prop, args)` | `p.then(t => t[prop](...args))` | `h.POST(t, prop, args)` |
| `p.get(prop)` | `p.then(t => t[prop])` | `h.GET(t, prop)` |
| `p.put(prop, value)` | `p.then(t => (t[prop] = value))` | `h.PUT(t, prop, value)` |
| `p.delete(prop)` | `p.then(t => delete t[prop])` | `h.DELETE(t, prop)` |
| `p.invoke(optKey, ...args)` | `p.post(optKey, args)` | (`post` shorthand only) |
| `p.fapply(args)` | `p.post(undefined, args)` | (`post` shorthand only) |
| `p.fcall(...args)` | `p.post(undefined, args)` | (`post` shorthand only) |

### Handled Promises

In a manner analogous to *Proxy* handlers, a *Promise* can be associated with a handler object that provides handler methods (`POST`, `GET`, `PUT`, and `DELETE`) as described in the previous section, to override its normal unhandled behaviour.  A *handled Promise* is constructed via:

```js
// create a handled promise with initial handler:
Promise.makeHandled((resolve, reject) => ..., handler);
// or when resolving a handled promise:
resolve(t, handler)
```

This handler is not exposed to the user of the *handled Promise*, so it provides a secure separation between user mode (where the infix bang syntax is used) and system mode (which implements the communication mechanism).

Below are some *handled Promise* examples:

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
  // Unimplemented handler methods throw errors if invoked.
};

const executorFulfilled = (resolve, reject) => {
  setTimeout(() => {
    // Resolve the target Promise with target and continue to associate handler with it.
    resolve(target, handler);
  }, 1000);
};

// Create an unfulfilled target Promise, associated with the handler.
const targetP = Promise.makeHandled(executorFulfilled, handler);

targetP!foo(a, b, c) // results in: queueMessage(slot, 'foo', [a, b, c]);
targetP!foo!(a, b, c) // same
```

If the *handler* (second argument) is not specified to `resolve`, the handler is the same one that has previously been assigned to `target`, or else as described in the **Default Behaviour** section.  If a *handler* does not implement a **Handler Method**, then a *TypeError* is thrown if the client code calls a method that relies on it.

#### Promise Pipelining

The [Promise pipelining](http://www.erights.org/elib/distrib/pipeline.html) mechanism allows enqueuing messages and immediately returning references that correspond to their results, without a network round trip.  *Handled Promises* are designed specifically to allow transparent implementation of this mechanism.

In the above example, the `queueMessage` function would decide how and when to send messages destined for a slot.  Even if the slot's destination is not yet determined, the message can be enqueued for later delivery.  Once the destination is resolved (in the `executor`), the enqueued messages can be delivered, and further messages also can be handled by `queueMessage`.

### Proposed Syntax

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

`[nlth]` above is short for "[No LineTerminator here]", in order to unambiguously distinguish infix from prefix bang in the face of automatic semicolon insertion.

## Implementation

There is a [shim for the proposed *Promise* API additions](https://github.com/Agoric/eventual-send), which makes it possible to use the expanded forms needed for infix bang, but not the infix bang syntax itself.

You can experiment with the infix bang syntax desugaring in the [Infix Bang REPL](https://babeljs.io/repl/build/11009/?externalPlugins=babel-plugin-syntax-infix-bang).  The following code fragments can be used as input:

```
x!p(y, z, q)
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

To fully implement promise pipelining requires more support from the *handled Promises* API.  We will require at least one new hook to notify the handler when a *Promise* resolves to another *Promise*, so that messages destined for the prior *Promise* can be reenqueued for the new *Promise*.  This change can be introduced in a later stage of this proposal while maintaining backward compatibility.

It is worth noting that TypeScript has introduced postfix bang as a [non-null assertion operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator), which partially conflicts with our proposed usage.  In TypeScript, `x![i]` tells the type system that `x` is not null, then evaluates as `x[i]`.  The ECMAScript [optional chaining proposal](https://github.com/TC39/proposal-optional-chaining) may mitigate the need for non-null assertion in that circumstance, with `x?.[i]` syntax.
