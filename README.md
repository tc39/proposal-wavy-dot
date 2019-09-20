# ECMAScript Wavy Dot Syntax: Support for chaining Promises
By Mark S. Miller (@erights), Chip Morningstar (@FUDCo), and Michael FIG (@michaelfig)

**ECMAScript Wavy Dot Syntax: Support for chaining Promises**

## Background

Promises were invented in the late 1980s, originally as a technique for
compensating for roundtrip latency in operations invoked remotely over a
network, though promises have since proven valuable for dealing with all manner
of asynchronous delays in computational systems.

The fundamental insight behind promises is this: in the classic presentation of
object oriented programming, an object is something that you can send messages
to in order to invoke operations on it.  If the result of such an operation is
another object, that result in turn is something that you can send messages to.
If the operation initiated by a message send entails an asynchronous delay to
get the result, rather than waiting (possibly for a long time) for the result
to eventually become available, you can instead immediately return another
object - a promise - that can stand in for the result in the meantime.  Since,
as we said, an object is just something you send messages to, a promise is, in
that respect, as good as the object it is a promise for -- you simply send it
messages as if it was the actual result.  The promise can't perform the invoked
operation directly, since what that means is not yet known, but it *can*
enqueue the request for later processing or relay it to the other end of a
network connection where the result will eventually be known.  This deferall of
operations through enqueuing or relaying can be pipelined an arbitrary number
of operations deep; it is only at the point where there is a semantic
requirement to actually see the result (such as the need to display it to a
human) that the pipeline must stall to await the final outcome.  Furthermore,
the point at which waiting for a result is truly required can often be much
later in a chain of computational activity than many people's intuitions lead
them to expect.

Since network latency is often the largest component of delay (by far) in a
remotely invoked operation, the overlapping of network transmissions that
promise pipelining makes possible can result an enormous overall improvement in
throughput in distributed systems.  For example, implementations of promise
pipelining for remote method invocation in the [Xanadu hypertext
system][http://udanax.xanadu.com/gold/] and in Microsoft's [Midori operating
system][http://joeduffyblog.com/2015/11/03/blogging-about-midori/] measured
speedups of 10 to 1,000 over traditional synchronous RPC, depending on use
case.

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
project](http://joeduffyblog.com/2015/11/19/asynchronous-everything/)
and [Cap'n Proto](https://capnproto.org/rpc.html), among others,
demonstrates that this approach to distributed computing works well at
scale.

The old [ECMAScript strawman concurrency
proposal](https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency)
also described a simple desugaring of an infix bang (*!*) operator to
allow chaining of remote-able promise operations. To avoid conflict with TypeScript, this proposal
instead introduces the wavy dot syntax (*~.*) syntax, with simple semantics integrated
with extensions to the `Promise` API.  We explain the notion of a
*handled Promise*, which extends a given `Promise` to implement
different wavy dot behaviors. These mechanisms, together with weak
references, enable writing remote object communications systems, but
they are not specific to any one. This proposal does not include any
specific usage of the mechanisms we propose, except as a motivating
example and test of adequacy.

## Details

In contrast to *async*/*await*, wavy dot is designed to allow the convenient chaining of *Promises* without interrupting evaluation.  The specific mechanism used by wavy dot allows us to implement remote network protocols taking advantage of *Promise Pipelining*.

### Wavy Dot

Wavy dot (*~.*) is a proposed operator with the same precedence as dot (*.*).

The **Synchronous Syntax** column describes the analogous synchronous operation on plain objects, while the **Promise Syntax** introduces the proposed *Promise*-based operations.
The *Promise.prototype* API additions needed for each **Promise Expansion** are explained in the following section.

| Synchronous Syntax | Promise Syntax	| Promise Expansion	|
|------- | --- | --- |
| `x[i](y, z)` | `x ~. [i](y, z)`	| `Promise.resolve(x).post(i, [y, z])`	|
| `x.p(y, z)` | `x ~. p(y, z)` |	`Promise.resolve(x).post('p', [y, z])`	|
| `x(y, z)` | `x ~. (y, z)`	 | `Promise.resolve(x).post(undefined, [y, z])`	|
| `x[i]` | `x ~. [i]`	| `Promise.resolve(x).get(i)` |
|	`x.p` | `x ~. p`	| `Promise.resolve(x).get('p')` |
| `x[i] = v` | `x ~. [i] = v`	| `Promise.resolve(x).put(i, v)` |
| `x.p = v` | `x ~. p = v`	| `Promise.resolve(x).put('p', v)` |
| `delete x[i]` | `delete x ~. [i]` |	`Promise.resolve(x).delete(i)` |
| `delete x.p` | `delete x ~. p`	| `Promise.resolve(x).delete('p')`	|

### Default Behaviour

The proposed *Promise.prototype* API additions have the following behaviour.  In the examples below, `p` is a promise and `t` is the resolution of that promise.  The **Default Behaviour** implements the same basic effect as the **Synchronous Syntax** column in the previous section, but operates on a promise.  The **Handled Behaviour** is described in the next section:

| Method | Default Behaviour | Handled Behaviour |
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

In a manner analogous to *Proxy* handlers, a promise can be associated with a handler object that provides handler methods (`POST`, `GET`, `PUT`, and `DELETE`) as described in the previous section, to override its normal unhandled behaviour.  A *handled Promise* is constructed via:

```js
// create a handled promise with initial handler:
Promise.makeHandled((resolve, reject) => ..., handler);
// or when resolving a handled promise:
resolve(t, handler)
```

This handler is not exposed to the user of the *handled Promise*, so it provides a secure separation between user mode (where the wavy dot syntax is used) and system mode (which implements the communication mechanism).

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
targetP ~. length.then(len => assert(len === 10));
targetP ~. concat(' foobar').then(val => assert(val === 'some value foobar'));

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

targetP ~. foo(a, b, c) // results in: queueMessage(slot, 'foo', [a, b, c]);
targetP ~. foo ~. (a, b, c) // same
```

If the *handler* (second argument) is not specified to `resolve`, the handler is the same one that has previously been assigned to `target`, or else as described in the **Default Behaviour** section.  If a *handler* does not implement a **Handler Method**, then a *TypeError* is thrown if the client code calls a method that relies on it.

#### Promise Pipelining

The [Promise pipelining](http://www.erights.org/elib/distrib/pipeline.html) mechanism allows enqueuing messages and immediately returning references that correspond to their results, without a network round trip.  *Handled Promises* are designed specifically to allow transparent implementation of this mechanism.

In the above example, the `queueMessage` function would decide how and when to send messages destined for a slot.  Even if the slot's destination is not yet determined, the message can be enqueued for later delivery.  Once the destination is resolved (in the `executor`), the enqueued messages can be delivered, and further messages also can be handled by `queueMessage`.

### Proposed Syntax

Abstract Syntax:

```
 Expression : ...
      Expression ~. [ Expression ] Arguments    // eventual post
      Expression ~. Arguments                   // eventual post
      Expression ~. [ Expression ]              // eventual get
      Expression ~. [ Expression ] = Expression // eventual put
      delete Expression ~. [ Expression ]       // eventual delete
```

Attempted Concrete Syntax:

```
  MemberExpression : ...
      MemberExpression ~ . [ Expression ]
      MemberExpression ~ . IdentifierName
  CallExpression : ...
      CallExpression ~ . [ Expression ] Arguments
      CallExpression ~ . IdentifierName Arguments
      MemberExpression ~ . Arguments
      CallExpression ~ . Arguments
      CallExpression ~ . [ Expression ]
      CallExpression ~ . IdentifierName
  UnaryExpression : ...
      delete CallExpression ~ . [ Expression ]
      delete CallExpression ~ . IdentifierName
  LeftHandSideExpression :
      Identifier
      CallExpression [ Expression ]
      CallExpression . IdentifierName
      CallExpression ~ . [ Expression ]
      CallExpression ~ . IdentifierName
```

## Implementation

There is a [shim for the proposed *Promise* API additions](https://github.com/Agoric/eventual-send), which makes it possible to use the expanded forms needed for wavy dot, but not the wavy dot syntax itself.

TODO: Fix the following REPL so it actually implements wavy dot instead of infix bang.

You can experiment with the wavy dot syntax desugaring in the [Infix Bang REPL](https://babeljs.io/repl/build/11009/?externalPlugins=babel-plugin-syntax-infix-bang).  The following code fragments can be used as input:

```js
x ~. p(y, z, q)
x ~. [i](y, z)
x ~. (y, z)
x ~. ()
x ~. p
x ~. [i]
x ~. p = v
x ~. [i] = v
delete x ~. p
delete x ~. [i]

```

## Caveats

To fully implement promise pipelining requires more support from the *handled Promises* API.  We will require at least one new hook to notify the handler when a promise resolves to another promise, so that messages destined for the prior promise can be re-enqueued for the new promise.  This change can be introduced in a later stage of this proposal while maintaining backward compatibility.
