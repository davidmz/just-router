import { describe, expect, it } from "vitest";

import {
  bunch,
  createRouter,
  Handler,
  param,
  re,
  route,
  RouteNotFound,
} from "./router";

describe("Router", () => {
  it("should create simple router", () => {
    const r = createRouter(route("foo", () => 42));

    expect(r("/foo/")).toBe(42);
    expect(r("/foo")).toBe(42);
    expect(r("foo")).toBe(42);
    expect(() => r("foo/bar")).toThrowError(RouteNotFound);
    expect(() => r("bar")).toThrowError(RouteNotFound);
    expect(() => r("")).toThrowError(RouteNotFound);
  });

  it("should create simple router with custom context", () => {
    const r = createRouter<number, { isFoo?: boolean }>(
      route(
        "foo",
        (ctx, next) => {
          ctx.state.isFoo = true;
          return next();
        },
        (ctx) => (ctx.state.isFoo ? 42 : 41)
      )
    );

    expect(r("foo")).toBe(42);
  });

  it("should create two-legs router", () => {
    const r = createRouter(
      bunch(
        route(re(/^foo/), () => 42),
        route("bar", () => 24)
      )
    );

    expect(r("/foo/")).toBe(42);
    expect(r("/foooo/")).toBe(42);
    expect(r("/bar")).toBe(24);
    expect(() => r("foo/bar")).toThrowError(RouteNotFound);
    expect(() => r("baz")).toThrowError(RouteNotFound);
  });

  it("should create router with fallback handler", () => {
    const r = createRouter(
      bunch(
        route("foo", () => 42),
        route("bar", () => 24),
        () => -1 // Catch-all handler
      )
    );

    expect(r("/foo/")).toBe(42);
    expect(r("/bar")).toBe(24);
    expect(r("foo/bar")).toBe(-1);
    expect(r("baz")).toBe(-1);
  });

  describe("deep router with params and fallback handler", () => {
    const setAdmin: Handler<string> = (_ctx, next) => {
      const res = next();
      return res ? `admin: ${res}` : null;
    };

    // prettier-ignore
    const r = createRouter(
      bunch(
        route(() => "home"),
        route("about", () => "about"),
        route("about", "blank", () => "about:blank"),
        route("admin", setAdmin, bunch(
          route(() => `admin`),
          route("users", bunch(
            route(() => `users`),
            route(param("username"), (ctx) => `user ${ctx.pathParams["username"]}`),
          )),
          () => "not found in admin"
        )),
        () => "not found"
      )
    );

    const testData = [
      ["/", "home"],
      ["/about", "about"],
      ["/about/blank", "about:blank"],
      ["/admin", "admin: admin"],
      ["/admin/users", "admin: users"],
      ["/admin/users/j%C3%B6hn", "admin: user jöhn"],
      ["/admin/admins", "admin: not found in admin"],
      ["/admin/users/john/snow", "admin: not found in admin"],
      ["/foo", "not found"],
    ];

    for (const [inp, out] of testData) {
      it(`should process "${inp}" as "${out}"`, () => expect(r(inp)).toBe(out));
    }
  });
});
