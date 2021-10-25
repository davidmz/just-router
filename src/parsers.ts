export abstract class Token {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
  equals(other: Token): boolean {
    return this.constructor === other.constructor && this.value === other.value;
  }
}

export class Text extends Token {
  override toString() {
    return encodeURIComponent(this.value);
  }
}
export class Separator extends Token {}
export class Param extends Token {}
export class Const extends Token {
  constructor(readonly name: string, value: string) {
    super(value);
  }
}

export const parseTemplate = splitter(/(?<!\\)\//, (t) => {
  if (/^{.*?(?<!\\)}$/.test(t)) {
    t = t.substring(1, t.length - 1);
    const m = /^(.*?)(?<!\\)=(.*)/.exec(t);
    if (!m) {
      return new Param(unescape(t));
    }
    return new Const(unescape(m[1]), unescape(m[2]));
  } else {
    return new Text(unescape(t));
  }
});

export const parsePath = splitter(
  '/',
  (p) => new Text(decodeURIComponent(p.replace(/\+/g, '%20')))
);

function unescape(text: string): string {
  return text.replace(/\\(.)/g, '$1');
}

function splitter(
  sepMatch: string | RegExp,
  mapper: (s: string) => Token,
  sep: Token = new Separator('/')
): (text: string) => Token[] {
  return function (text: string) {
    const parts: Token[] = [];
    let idx: number;
    while ((idx = text.search(sepMatch)) !== -1) {
      idx && parts.push(mapper(text.substring(0, idx)));
      parts.push(sep);
      text = text.substring(idx + 1);
    }
    text && parts.push(mapper(text));
    return parts;
  };
}
