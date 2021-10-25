import { greedy, oneOf, route } from './route';

describe('route', () => {
  it('should handle simple route', () => {
    const h = jest.fn(() => true);
    const r = route('/{lang}', h);

    expect(r('/ru')).toBe(true);
    expect(h).toBeCalledWith({ params: { lang: 'ru' }, tail: '', path: '/ru' });

    h.mockClear();
    expect(r('/ru/foo')).toBe(false);
    expect(h).not.toBeCalled();
  });

  it('should handle oneOf routes', () => {
    const h = jest.fn(() => true);
    const r = oneOf(route('/about', h), route('/{lang}', h));

    expect(r('/ru')).toBe(true);
    expect(h).toBeCalledWith({ params: { lang: 'ru' }, tail: '', path: '/ru' });

    h.mockClear();
    expect(r('/about')).toBe(true);
    expect(h).toBeCalledWith({ params: {}, tail: '', path: '/about' });
  });

  it('should handle chain of routes', () => {
    const h = jest.fn(() => true);
    const r = route('/{lang}', route('/about', h));

    expect(r('/ru/about')).toBe(true);
    expect(h).toBeCalledWith({ params: { lang: 'ru' }, tail: '', path: '/ru/about' });

    h.mockClear();
    expect(r('/ru')).toBe(false);
    expect(h).not.toBeCalled();

    h.mockClear();
    expect(r('/ru/about/foo')).toBe(false);
    expect(h).not.toBeCalled();
  });

  it('greedy handler', () => {
    const h = jest.fn(() => true);
    const r = route('/{lang}', greedy(h));

    expect(r('/ru/about')).toBe(true);
    expect(h).toBeCalledWith({ params: { lang: 'ru' }, tail: '/about', path: '/ru/about' });
  });

  it('catch-all handler', () => {
    const h = jest.fn(() => true);
    const r = route('', greedy(h));

    expect(r('/ru/about')).toBe(true);
    expect(h).toBeCalledWith({ params: {}, tail: '/ru/about', path: '/ru/about' });
  });

  it('should handle complex routing', () => {
    const ctl = {
      index: jest.fn(() => true),
      home: jest.fn(() => true),
      about: jest.fn(() => true),
      notFound: jest.fn(() => true),
    };
    const r = oneOf(
      route('/', ctl.index),
      route('/{lang}', oneOf(route('/home', ctl.home), route('/{page=about}', ctl.about))),
      route('', greedy(ctl.notFound))
    );

    const expectCall = (path: string, handler: Function, params = {}, tail = '') => {
      jest.clearAllMocks();
      expect(r(path)).toBe(true);
      expect(handler).toBeCalledWith({ path, params, tail });
      for (const h of Object.values(ctl)) {
        if (h !== handler) {
          expect(h).not.toBeCalled();
        }
      }
    };

    expectCall('/', ctl.index);
    expectCall('/ru', ctl.notFound, {}, '/ru');
    expectCall('/ru/foo', ctl.notFound, {}, '/ru/foo');
    expectCall('/ru/home', ctl.home, { lang: 'ru' });
    expectCall('/en/about', ctl.about, { lang: 'en', page: 'about' });
  });
});
