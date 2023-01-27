export type Next<T> = () => T;
export type ContextSaver<C> = (context: C) => () => void;
export type Handler<C, T> = (context: C, next: Next<T>) => T;

export function combineHandlers<T, C>(hs: Handler<C, T>[]): Handler<C, T> {
  return (context, next) => {
    const nxt = ([first, ...rest]: Handler<C, T>[]): Next<T> =>
      first ? () => first(context, nxt(rest)) : next;

    return nxt(hs)();
  };
}

export function someHandler<C, T>(
  ctxSaver: ContextSaver<C>,
  hs: Handler<C, T | undefined>[]
): Handler<C, T | undefined> {
  return (context, next) => {
    const restore = ctxSaver(context);
    for (const h of hs) {
      let result: T | undefined;
      try {
        result = h(context, next);
      } finally {
        if (typeof result === "undefined") {
          restore();
        }
      }
      if (typeof result !== "undefined") {
        return result;
      }
    }
    return undefined;
  };
}
