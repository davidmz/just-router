# just-router

A very simple path matching and routing library. It is framework-independent,
works synchronously, has a small size (< 700 B min/gz) and concise API.

## Installation

Install it from npm as
[@davidmz/just-router](https://www.npmjs.com/package/@davidmz/just-router)

## Usage (sort of tutorial)

### What is "router" and how to create one

Router creates by _createRouter(…)_ call.

The created router itself has a simple function `<T>(path: string) => T`. It
takes path (string) and returns something that makes sense for your application.
It can be, fo example, a React component or HTML string.

Path is a regular pathname, the string like "/path/to/some/thing". Path actually
processed as a list of _segments_: "/path/to/some/thing" -> ["path", "to",
"some", "thing"]. All slashes are ignored: "/foo", "/foo/", "foo" or "///foo/"
are all the same for the router.

### Handlers (who do everything here)

The _createRouter_ function takes single argument of type _Handler_. _Handler_
is the main working type for the all library. It is a function with signature:

```typescript
type Handler<T, S extends object = object> = (
  context: Context<S>,
  next: Next<Nullable<T>>
) => Nullable<T>;
```

It may look complex because of type declarations, but actually it is very simple
middleware-like (as in _koa_ or other routing libs) function that accepts the
request _context_ ant the _next_ function, and returns type T or nothing (null |
undefined). If handler is a _middleware_ (i.e. it just prepared data for the
next handlers), it should call _next_. If it is a terminal handler, it shouldn't
(it will cause an error).

By the way, the _context_ has the following type:

```typescript
type Context<S extends object = object> = {
  // The initial 'path' passed to router. Immutable.
  readonly path: string;
  // The segments of path. This list can be altered by handlers.
  segments: string[];
  // Named parameters, taken from path segments (see _param_ handler).
  pathParams: Record<string, string>;
  // An arbitrary request state. Handlers can store everything in it.
  state: S;
};
```

The simplest possible router looks like this:

```typescript
const router = createRouter(() => "Hello!");

expect(router("/foo/bar")).toBe("Hello!");
```

This router is useless, it will return "Hello!" for any given path. The
_createRouter_ hasn't any path processing logic, we need a _handlers_ for it.

### Routes and path matching

The _route_ function creates handler that allows to check path segments and call
the terminal handler (handler that returns value and don't call 'next'):

```typescript
const router = createRouter(route("foo", () => "Hello!"));

expect(router("/foo")).toBe("Hello!");
expect(() => router("/foo/bar")).toThrow(RouteNotFound);
```

_route_ takes variable (but at least one) number of arguments. The last argument
must be a handler function, other can be handler functions or just strings.

Actually, strings acts like handlers here, _route_ wraps them by _eq(…)_. The
_eq_ helper takes string and creates handler that compares the current segment
with it. So, `route("foo", () => "Hello!")` is the same as `route(eq("foo"), ()
=> "Hello!")`.

The _route_ arguments forms handlers chain and executes sequentially, being
linked via the _next_ argument of each other. So `route(a, b, c)` will act like
`a(ctx, () => b(ctx, () => c(ctx, next)))`.

### Path parameters

Having _route_ and middleware handlers, we can now process path parameters. Like
this:

```typescript
const router = createRouter(
  route(
    "articles",
    param("slug"),
    (ctx) => "Article: " + ctx.pathParams["slug"]
  )
);

expect(router("/articles/routing")).toBe("Article: routing");
```

The _param_ helper takes current path segment and places it to the context's
_pathParams_ object with the given key.

### The "re" helper

The _re_ helper allow to define regexp to match segment. It combines _eq_ and
_param_ functionality, since it allows you to both specify a segment pattern and
capture come data from it.

To match specific segment format just use a relevant regexp: the `re(/[1-9]\d*/)` will match only the numeric segments.

To capture segment or it part(s), use regex [named
groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Backreferences):

```typescript
const router = createRouter(
  route(re(/article(?<id>)/), (ctx) => "Article ID=" + ctx.pathParams["id"])
);

expect(router("/article42")).toBe("Article ID=42");
```

### Root path

It is worth noting that root path can be matched by the route with single
terminal handler:

```typescript
const router = createRouter(route(() => "I am root!"));

expect(router("/")).toBe("I am root!");
```

### Bunch of routes

So far we have dealt with one route, which matches a single path to a single
terminal handler. In practice we need to handle many different paths, a bunch of
them. That's what the _bunch_ function is for.

```typescript
const router = createRouter(
  bunch(
    route(() => "Root page"),
    route("foo", () => "Foo page"),
    route("bar", () => "Bar page")
  )
);

expect(router("/")).toBe("Root page");
expect(router("/foo")).toBe("Foo page");
expect(router("/bar")).toBe("Bar page");
expect(() => router("/baz")).toThrow(RouteNotFound);
```

The _bunch_ function takes set of handlers and returns a handler (again!) that:

- Calls given handlers from first to last;
- Stops on first non-nullish result and returns it.

### Catch-all handlers

You may notice that our router throws a _RouteNotFound_ error it there is not
matched route. This is because handlers created with route (almost) always
require a complete path match. In practice, we often need a handler for "all
other" paths, for example to show the "Not found" page.

Fortunately, it's very easy to add it. Remember that the "bare" handler doesn't
care about path matching. So we can do the following:

```typescript
const router = createRouter(
  bunch(
    route("foo", () => "Foo page"),
    () => "Not found"
  )
);

expect(router("/foo")).toBe("Foo page");
expect(router("/bar")).toBe("Not found");
```

### Greedy handlers

Here it is worth noting that _route_ requires that at the time the last handler
in the chain is called, all segments of the path must be processed. So the
`route("foo", handler)` will match "/foo", but not "/foo/bar", although the last
one also starts from "foo" segment.

Sometimes we need a handler that just grabs all the remaining segments. We can declare that handler as _greedy_.

```typescript
const router = createRouter(
  bunch(
    route("foo", () => "Foo page"),
    route(
      "bar",
      greedy((ctx) => "Bar page: " + (ctx.segments.join(", ") || "-"))
    )
  )
);

expect(router("/foo")).toBe("Foo page");
expect(router("/bar")).toBe("Bar page: -");
expect(router("/bar/baz")).toBe("Bar page: baz");
expect(router("/bar/baz/qux")).toBe("Bar page: baz, qux");
```

The _greedy_ function is rarely needed by itself, but it is important that the
handler the _bunch_ returns is also greedy. This allows you to make nested
bunches.

### Nested bunches

Here we can create a really complex staff!

```typescript
const router = createRouter(
  bunch(
    route(() => "Home"),
    route("about", () => "About"),
    route(
      "projects",
      bunch(
        route(() => "Projects list"),
        route(param("name"), (ctx) => "Project: " + ctx.pathParams["name"]),
        () => "Project not found"
      )
    ),
    route(
      "admin",
      checkRights, // Your own logic!
      bunch(
        route(() => "Admin home"),
        route("users", () => "List of users")
      )
    ),
    () => "Page not found"
  )
);
```

That's all!

## API methods signatures

### createRouter

```typescript
function createRouter<T, S>(route: Handler<T, S>): Router<T>;
```

### route

```typescript
function route<T, S>(
  ...handlers: [...(string | Handler<T, S>)[], Handler<T, S>]
): Handler<T, S>;
```

### bunch

```typescript
function bunch<T, S>(...handlers: Handler<T, S>[]): Handler<T, S>;
```

### param

```typescript
function param<T, S>(name: string): Handler<T, S>;
```

### eq

```typescript
function eq<T, S>(segment: string): Handler<T, S>;
```

### re

```typescript
function re<T, S>(re: RegExp): Handler<T, S>;
```

### greedy

```typescript
function greedy<T, S>(fn: Handler<T, S>): Handler<T, S>;
```
