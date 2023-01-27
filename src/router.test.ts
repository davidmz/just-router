import { describe, expect, it } from "vitest";
import {
  Handler,
  RouteNotFound,
  bunch,
  param,
  root,
  route,
  router,
} from "./router";

describe("Router", () => {
  it("should create simple router", () => {
    const r = router(route("foo", () => 42));

    expect(r("/foo/")).toBe(42);
    expect(r("/foo")).toBe(42);
    expect(r("foo")).toBe(42);
    expect(() => r("foo/bar")).toThrowError(RouteNotFound);
    expect(() => r("bar")).toThrowError(RouteNotFound);
    expect(() => r("")).toThrowError(RouteNotFound);
  });

  it("should create simple router with custom context", () => {
    const r = router<number, { isFoo?: boolean }>(
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
    const r = router(
      bunch(
        route("foo", () => 42),
        route("bar", () => 24)
      )
    );

    expect(r("/foo/")).toBe(42);
    expect(r("/bar")).toBe(24);
    expect(() => r("foo/bar")).toThrowError(RouteNotFound);
    expect(() => r("baz")).toThrowError(RouteNotFound);
  });

  it("should create router with fallback handler", () => {
    const r = router(
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
      return res ? `admin: ${res}` : undefined;
    };

    // prettier-ignore
    const r = router(
      bunch(
        route(root(), () => "home"),
        route("about", () => "about"),
        route("admin", setAdmin, bunch(
          route(root(), () => `admin`),
          route("users", bunch(
            route(root(), () => `users`),
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
      ["/admin", "admin: admin"],
      ["/admin/users", "admin: users"],
      ["/admin/users/john", "admin: user john"],
      ["/admin/admins", "admin: not found in admin"],
      ["/admin/users/john/snow", "admin: not found in admin"],
      ["/foo", "not found"],
    ];

    for (const [inp, out] of testData) {
      it(`should process "${inp}" as "${out}"`, () => expect(r(inp)).toBe(out));
    }
  });
});
