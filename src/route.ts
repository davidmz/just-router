import { Match, matcher } from './matcher';

const isGreedy = Symbol('greedy');

interface Route {
  (arg: string | Match): boolean;
  [isGreedy]: true;
}

export interface Handler {
  (arg: Match): boolean;
}

export function route(template: string, next: Handler | Route): Route {
  const match = matcher(template);
  return greedy((pathOrMatch) => {
    const { path, tail, params } = asMatch(pathOrMatch);
    const m = match(tail);
    if (!m || (m.tail !== '' && !(isGreedy in next))) {
      return false;
    }
    m.path = path;
    m.params = { ...params, ...m.params };
    return next(m);
  });
}

export function oneOf(...rs: [Route, ...Route[]]): Route {
  return greedy((pathOrMatch: string | Match) => rs.some((r) => r(pathOrMatch)));
}

export function greedy(fn: (arg: Match) => boolean): Route;
export function greedy(fn: (arg: string | Match) => boolean): Route;
export function greedy(fn: Function): Route {
  return Object.assign(fn, { [isGreedy]: true as const }) as Route;
}

function asMatch(pathOrMatch: string | Match): Match {
  return typeof pathOrMatch === 'string'
    ? { params: {}, tail: pathOrMatch, path: pathOrMatch }
    : pathOrMatch;
}
