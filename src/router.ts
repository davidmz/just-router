import type { Handler as CoreHandler, Nullable } from "./core";
import { combineHandlers, someHandler } from "./core";

export type Context<S extends object = object> = {
  readonly path: string;
  segments: string[];
  pathParams: Record<string, string>;
  state: S;
};

export type Handler<T, S extends object = object> = CoreHandler<
  Nullable<T>,
  Context<S>
>;
export type Router<T> = (path: string) => T;

export class UnexpectedCall extends Error {
  // no content
}
export class RouteNotFound extends Error {
  // no content
}

function toSegments(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}

export function createRouter<T, S extends object = object>(
  route: Handler<T, S>
): Router<T> {
  return function (path: string): T {
    const context: Context<S> = {
      path,
      segments: toSegments(path),
      pathParams: {},
      state: {} as S,
    };
    const result = route(context, () => {
      throw new UnexpectedCall("Unexpected call of final handler");
    });
    if (result == null) {
      throw new RouteNotFound("Cannot find route");
    }
    return result;
  };
}

const greedyHandlers = new WeakSet<object>();

export function route<T, S extends object = object>(
  ...handlers: [...(string | RegExp | Handler<T, S>)[], Handler<T, S>]
): Handler<T, S> {
  const last = handlers[handlers.length - 1] as Handler<T, S>;
  return combineHandlers([
    ...handlers.slice(0, handlers.length - 1).map(toHandler<T, S>),
    greedyHandlers.has(last) ? last : lastHandler(last),
  ]);
}

export function bunch<T, S extends object = object>(
  ...handlers: Handler<T, S>[]
): Handler<T, S> {
  return greedy(someHandler(contextSaver, handlers));
}

export function param<T, S extends object = object>(
  name: string
): Handler<T, S> {
  return (ctx, next) => {
    if (ctx.segments.length > 0) {
      ctx.pathParams[name] = ctx.segments[0];
      ctx.segments.shift();
      return next();
    }
    return null;
  };
}

export function split<T, S extends object = object>(
  path: string
): Handler<T, S> {
  const segments = toSegments(path);
  return (context, next) => {
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] !== context.segments[i]) {
        return null;
      }
    }

    context.segments.splice(0, segments.length);
    return next();
  };
}

// Private functions

function greedy<T, S extends object = object>(
  fn: Handler<T, S>
): Handler<T, S> {
  greedyHandlers.add(fn);
  return fn;
}

function str<T, S extends object = object>(segment: string): Handler<T, S> {
  return (context, next) => {
    if (context.segments[0] === segment) {
      context.segments.shift();
      return next();
    }
    return null;
  };
}

function re<T, S extends object = object>(re: RegExp): Handler<T, S> {
  return (context, next) => {
    const [seg] = context.segments;
    if (!seg) {
      return null;
    }
    const m = re.exec(seg);
    if (!m) {
      return null;
    }
    context.segments.shift();
    if (m.groups) {
      for (const name of Object.keys(m.groups)) {
        context.pathParams[name] = m.groups[name];
      }
    }
    return next();
  };
}

function contextSaver(ctx: Context) {
  const segments = [...ctx.segments];
  const pathParams = { ...ctx.pathParams };
  const state = { ...ctx.state };
  return () => {
    ctx.segments = [...segments];
    ctx.pathParams = { ...pathParams };
    ctx.state = { ...state };
  };
}

function toHandler<T, S extends object = object>(
  p: string | RegExp | Handler<T, S>
): Handler<T, S> {
  if (typeof p === "string") {
    return str(p);
  }
  if (p instanceof RegExp) {
    return re(p);
  }
  return p;
}

function lastHandler<T, S extends object = object>(
  fn: Handler<T, S>
): Handler<T, S> {
  return (context, next) =>
    context.segments.length === 0 ? fn(context, next) : null;
}
