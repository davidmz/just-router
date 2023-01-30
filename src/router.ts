import { Handler as CoreHandler, combineHandlers, someHandler } from "./core";

export type Context<S extends object = {}> = {
  readonly path: string;
  segments: string[];
  pathParams: Record<string, any>;
  state: S;
};

export type Handler<T, S extends object = {}> = CoreHandler<
  Context<S>,
  T | undefined
>;
export type Router<T> = (path: string) => T;

export class UnexpectedCall extends Error {}
export class RouteNotFound extends Error {}

export function createRouter<T, S extends object = {}>(
  route: Handler<T, S>
): Router<T> {
  return function (path: string): T {
    const context: Context<S> = {
      path,
      segments: path
        .split("/")
        .filter(Boolean)
        .map((s) => decodeURIComponent(s)),
      pathParams: {},
      state: {} as S,
    };
    const result = route(context, () => {
      throw new UnexpectedCall("Unexpected call of final handler");
    });
    if (typeof result === "undefined") {
      throw new RouteNotFound("Cannot find route");
    }
    return result;
  };
}

const greedyHandlers = new WeakSet<object>();

export function route<T, S extends object = {}>(
  ...handlers:
    | [string, Handler<T, S>, ...Handler<T, S>[]]
    | [Handler<T, S>, ...Handler<T, S>[]]
): Handler<T, S> {
  const last = handlers[handlers.length - 1] as Handler<T, S>;
  return combineHandlers([
    ...handlers.slice(0, handlers.length - 1).map(segmentToHandler<T, S>),
    greedyHandlers.has(last) ? last : lastHandler(last),
  ]);
}

export function bunch<T, S extends object = {}>(
  ...handlers: Handler<T, S>[]
): Handler<T, S> {
  return greedy(someHandler(contextSaver, handlers));
}

export function param<T, S extends object = {}>(name: string): Handler<T, S> {
  return (ctx, next) => {
    if (ctx.segments.length > 0) {
      ctx.pathParams[name] = ctx.segments[0];
      ctx.segments.shift();
      return next();
    }
    return undefined;
  };
}

export function greedy<T, S extends object = {}>(
  fn: Handler<T, S>
): Handler<T, S> {
  greedyHandlers.add(fn);
  return fn;
}

export function re<T, S extends object = {}>(re: RegExp): Handler<T, S> {
  return (context, next) => {
    const [seg] = context.segments;
    if (!seg) {
      return undefined;
    }
    const m = re.exec(seg);
    if (!m) {
      return undefined;
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

// Private functions

function contextSaver(ctx: Context) {
  const segments = [...ctx.segments];
  const pathParams = { ...ctx.pathParams };
  const state = { ...ctx.state };
  return () => {
    ctx.segments = segments;
    ctx.pathParams = pathParams;
    ctx.state = state;
  };
}

function segmentToHandler<T, S extends object = {}>(
  p: string | Handler<T, S>
): Handler<T, S> {
  if (typeof p === "string") {
    return constSegment(p);
  }
  return p;
}

function constSegment<T, S extends object = {}>(
  segment: string
): Handler<T, S> {
  return (context, next) => {
    if (context.segments[0] === segment) {
      context.segments.shift();
      return next();
    }
    return undefined;
  };
}

function lastHandler<T, S extends object = {}>(
  fn: Handler<T, S>
): Handler<T, S> {
  return (context, next) =>
    context.segments.length === 0 ? fn(context, next) : undefined;
}
