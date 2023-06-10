# just-router

A very simple path matching and routing library. It is framework-independent,
works synchronously, has a small size (< 750 B min/gz) and concise API.

## Installation

Install it from npm as
[@davidmz/just-router](https://www.npmjs.com/package/@davidmz/just-router)

## Usage (sort of tutorial)

### What is "router" and how to create one

Routers are created by _createRouter(…)_ call.

The router itself has a simple function `<T>(path: string) => T`. It takes path
(string) and returns something that makes sense for your application. It can be,
fo example, a React component or HTML string.

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
request _context_ and the _next_ function, and returns type T or nothing (null |
undefined). If handler is a _middleware_ (i.e. it just prepare data for the next
handlers), it should call _next_. If it is a terminal handler, it shouldn't
(this will cause an error).

By the way, the _context_ has the following type:

```typescript
type Context<S extends object = object> = {
  // The initial 'path' passed to router. Immutable.
  readonly path: string;
  // The path segments. This list can be altered by handlers.
  segments: string[];
  // Named parameters, taken from path segments (see _param_ handler).
  pathParams: Record<string, string>;
  // An arbitrary request state. Handlers can store everything in it.
  state: S;
};
```

The simplest router looks like this:

```typescript
const router = createRouter(() => "Hello!");

expect(router("/foo/bar")).toBe("Hello!");
```

This router is pretty useless because it will return "Hello!" for any given
path. The _createRouter_ hasn't any path processing logic, we need an additional
handlers for it.

### Routes and path matching

The _route_ function creates handler that allows to check path segments and call
the terminal handler (handler that returns value and don't call 'next'):

```typescript
const router = createRouter(route("foo", () => "Hello!"));

expect(router("/foo")).toBe("Hello!");
expect(() => router("/foo/bar")).toThrow(RouteNotFound);
```

_route_ takes variable (but at least one) number of arguments. The last argument
must be a handler function, other can be handler functions, strings, or regexps.

_route_ internally converts strings and regexps to the regular handlers. String
means that the segment must exactly match the string. Regexp also requires
match, but can also capture part of the segment (see below).

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

### Regexp matchers

Regexp matchers combines string and _param_ functionality, since it allows you
to both specify a segment pattern and capture come data from it.

To match specific segment format just use a relevant regexp: the `/[1-9]\d*/` will match only the numeric segments.

To capture segment or it part(s), use regex [named
groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Backreferences):

```typescript
const router = createRouter(
  route(/article(?<id>[1-9]\d*)/, (ctx) => "Article ID=" + ctx.pathParams["id"])
);

expect(router("/article42")).toBe("Article ID=42");
```

### 'split' helper

Route arguments work on a per-segment basis, but sometimes it is more convenient
to specify (sub)path as a single string. It is possible with _split_ helper. The following routes are equivalent:

```typescript
route("path", "to", "articles", param("id"), showArticle);
route(split("path/to/articles"), param("id"), showArticle);
```

### Root path

The root path can be matched by the route with single terminal handler:

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
matched route. This is because handlers, created with _route_, (almost) always
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

As was mentioned earlier, _route_ requires the complete path match. This means
that at the time the last handler in the chain is called, all segments of the
path must be processed. So the `route("foo", handler)` will match "/foo", but
not "/foo/bar", although the last one also starts from "foo" segment.

Sometimes we need a "greedy" handler that grabs all the remaining segments. In
such case, just wrap you handler with _batch_. The handler the _bunch_ returns
is greedy, this allows to make nested bunches.

```typescript
const router = createRouter(
  bunch(
    route("foo", () => "Foo page"),
    route(
      "bar",
      bunch((ctx) => "Bar page: " + (ctx.segments.join(", ") || "-"))
    )
  )
);

expect(router("/foo")).toBe("Foo page");
expect(router("/bar")).toBe("Bar page: -");
expect(router("/bar/baz")).toBe("Bar page: baz");
expect(router("/bar/baz/qux")).toBe("Bar page: baz, qux");
```

### Nested bunches

Here we can create a really complex staff!

```typescript
const router = createRouter(
  bunch(
    route(() => "Home"),
    route("about", () => "About"),
    route(split("about/contacts"), () => "Contacts"),
    route(
      "projects",
      bunch(
        route(() => "Projects list"),
        route(param("name"), (ctx) => "Project: " + ctx.pathParams["name"]),
      )
    ),
    route(
      "admin",
      checkRights, // Your own logic!
      bunch(
        route(() => "Admin home"),
        route("users", () => "List of users")
        () => "Admin page not found"
      )
    ),
    () => "Page not found"
  )
);

expect(router("/")).toBe("Home");
expect(router("/about")).toBe("About");
expect(router("/about/contacts")).toBe("Contacts");
expect(router("/projects")).toBe("Projects list");
expect(router("/projects/foo")).toBe("Project: foo");
expect(router("/admin/foo")).toBe("Admin page not found");
// ...and so on
```

That's all you need to know!

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

### split

```typescript
function split<T, S>(path: string): Handler<T, S>;
```
