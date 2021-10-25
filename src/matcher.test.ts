import { Match, matcher } from './matcher';

describe('matcher', () => {
  const testData = [
    { template: '/', path: '/', result: res() },
    { template: '/abc', path: '/abc', result: res() },
    { template: '/abc/', path: '/abc/def', result: res({}, 'def') },
    { template: '/abc/{name}', path: '/abc/def', result: res({ name: 'def' }) },
    {
      template: '/abc/{foo}/{bar}',
      path: '/abc/def/gh/ij',
      result: res({ foo: 'def', bar: 'gh' }, '/ij'),
    },
    { template: '/abc/{foo}/{foo}', path: '/abc/def/gh', result: null },
    { template: '/abc/{foo}/{foo}', path: '/abc/def/def', result: res({ foo: 'def' }) },
    { template: '/abc/{name}/', path: '/abc/def', result: null },
    { template: '/abc/{name=foo}', path: '/abc/def', result: null },
    { template: '/abc/{name=foo}', path: '/abc/foo', result: res({ name: 'foo' }) },
    { template: '/{name=foo}/{name}', path: '/foo/foo', result: res({ name: 'foo' }) },
    { template: '/{name=foo}/{name}', path: '/foo/bar', result: null },
    {
      template: '/abc/{name}',
      path: '/abc/%D0%A1%D0%BE%D0%BB%D1%8C',
      result: res({ name: 'Соль' }),
    },
  ].map((t) => (t.result && (t.result.path = t.path), t));

  for (const { template, path, result } of testData) {
    it(`path "${path}" should${result === null ? ' not' : ''} match "${template}"`, () => {
      const match = matcher(template);
      expect(match(path)).toEqual(result);
    });
  }
});

function res(params: Record<string, string> = {}, tail: string = '') {
  return new Match(params, '', tail);
}
