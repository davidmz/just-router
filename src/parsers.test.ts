import { describe, expect, it } from 'vitest';
import { parseTemplate, parsePath, Separator, Param, Text, Const } from './parsers';

const sep = new Separator('/');
const txt = (s: string) => new Text(s);
const param = (s: string) => new Param(s);
const cparam = (n: string, v: string) => new Const(n, v);

describe('parsers', () => {
  describe('parseTemplate', () => {
    const testData = [
      { template: '/', result: [sep] },
      { template: '/ab/cd', result: [sep, txt('ab'), sep, txt('cd')] },
      { template: 'ab/cd', result: [txt('ab'), sep, txt('cd')] },
      { template: 'ab\\/cd', result: [txt('ab/cd')] },
      { template: '/ab/{cd}', result: [sep, txt('ab'), sep, param('cd')] },
      { template: '/ab/{cd}ef', result: [sep, txt('ab'), sep, txt('{cd}ef')] },
      { template: '/ab/\\{cd\\}', result: [sep, txt('ab'), sep, txt('{cd}')] },
      { template: '/ab/', result: [sep, txt('ab'), sep] },
      { template: '', result: [] },
      {
        template: '/ab/{qq=def}/cd',
        result: [sep, txt('ab'), sep, cparam('qq', 'def'), sep, txt('cd')],
      },
    ];
    for (const { template, result } of testData) {
      it(`should parse "${template}"`, () => expect(parseTemplate(template)).toEqual(result));
    }
  });

  describe('parsePath', () => {
    const testData = [
      { path: '/', result: [sep] },
      { path: '/ab/cd', result: [sep, txt('ab'), sep, txt('cd')] },
      { path: 'ab/cd', result: [txt('ab'), sep, txt('cd')] },
      { path: 'ab%2Fcd', result: [txt('ab/cd')] },
      { path: 'ab cd', result: [txt('ab cd')] },
      { path: 'ab+cd', result: [txt('ab cd')] },
      { path: 'ab%20cd', result: [txt('ab cd')] },
      { path: '%D1%88%D1%88%D1%88', result: [txt('шшш')] },
    ];
    for (const { path, result } of testData) {
      it(`should parse "${path}"`, () => expect(parsePath(path)).toEqual(result));
    }
  });
});
