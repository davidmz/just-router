export type Next<T> = () => T;
export type ContextSaver<C> = (context: C) => () => void;
export type Handler<T, C> = (context: C, next: Next<T>) => T;
export type Nullable<T> = T | null | undefined;

export function combineHandlers<T, C>(hs: Handler<T, C>[]): Handler<T, C> {
  return (context, next) => {
    const nxt = ([first, ...rest]: Handler<T, C>[]): Next<T> =>
      first ? () => first(context, nxt(rest)) : next;

    return nxt(hs)();
  };
}

export function someHandler<C, T>(
  ctxSaver: ContextSaver<C>,
  hs: Handler<Nullable<T>, C>[]
): Handler<Nullable<T>, C> {
  return (context, next) => {
    const restore = ctxSaver(context);
    for (const h of hs) {
      const result = h(context, next);
      if (result != null) {
        return result;
      } else {
        restore();
      }
    }
    return undefined;
  };
}
