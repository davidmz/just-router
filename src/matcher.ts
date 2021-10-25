import { Const, Param, parsePath, parseTemplate, Separator, Text, Token } from './parsers';

export type Params = Record<string, string>;

export class Match {
  // public meta: any = {};
  constructor(public params: Params = {}, public path: string = '', public tail: string = '') {}
}

export function matcher(template: string) {
  const tpl = parseTemplate(template);
  return (path: string) => {
    const m = match(tpl, parsePath(path));
    m && (m.path = path);
    return m;
  };
}

function match(template: Token[], path: Token[]) {
  if (path.length < template.length) {
    return null;
  }

  const result = new Match();
  for (let i = 0; i < template.length; i++) {
    const [tokenT, tokenP] = [template[i], path[i]];
    if (tokenT instanceof Text || tokenT instanceof Separator) {
      if (!tokenT.equals(tokenP)) {
        return null;
      }
    } else if (tokenT instanceof Param && tokenP instanceof Text) {
      if (
        result.params[tokenT.value] !== undefined &&
        result.params[tokenT.value] !== tokenP.value
      ) {
        return null;
      }
      result.params[tokenT.value] = tokenP.value;
    } else if (tokenT instanceof Const && tokenP instanceof Text) {
      if (tokenT.value !== tokenP.value) {
        return null;
      }
      if (result.params[tokenT.name] !== undefined && result.params[tokenT.name] !== tokenP.value) {
        return null;
      }
      result.params[tokenT.name] = tokenP.value;
    } else {
      // We should never reach this
      throw new Error(`Unknown or unexpected token`);
    }
  }

  result.tail = path
    .slice(template.length)
    .map((p) => p.toString())
    .join('');
  return result;
}
