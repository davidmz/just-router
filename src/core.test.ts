import { describe, expect, it } from "vitest";
import { ContextSaver, combineHandlers, someHandler } from "./core";

describe("Router 3 - Core", () => {
  describe("combineHandlers", () => {
    it("should combine 0 handlers", () => {
      const h = combineHandlers<number, unknown>([]);
      expect(h({}, () => 42)).toBe(42);
    });

    it("should combine 1 handler", () => {
      const h = combineHandlers<number, unknown>([(_, n) => 2 * n()]);
      expect(h({}, () => 42)).toBe(84);
    });

    it("should combine 2 handlers", () => {
      const h = combineHandlers<number, unknown>([
        (_, n) => 2 * n(),
        (_, n) => n() / 4,
      ]);
      expect(h({}, () => 42)).toBe(21);
    });

    it("should combine 2 handlers with return in first", () => {
      const h = combineHandlers<number, unknown>([() => 137, (_, n) => n()]);
      expect(h({}, () => 42)).toBe(137);
    });
  });

  describe("someHandler", () => {
    const saver = () => () => {};

    it("should combine 0 handlers", () => {
      const h = someHandler(saver, []);
      expect(h({}, () => 42)).toBeUndefined();
    });

    it("should combine 1 defined handler", () => {
      const h = someHandler(saver, [(_, next) => next()]);
      expect(h({}, () => 42)).toBe(42);
    });

    it("should combine 1 undefined handler", () => {
      const h = someHandler<unknown, number>(saver, [() => undefined]);
      expect(h({}, () => 42)).toBeUndefined();
    });

    it("should combine 2 handlers (undefined + defined)", () => {
      const h = someHandler(saver, [() => undefined, (_, next) => next()]);
      expect(h({}, () => 42)).toBe(42);
    });
  });

  describe("someHandler with saver", () => {
    type Ctx = { foo: number };
    const saver: ContextSaver<Ctx> = (ctx) => {
      const prevFoo = ctx.foo;
      return () => (ctx.foo = prevFoo);
    };

    it("should return modified foo", () => {
      const h = someHandler<Ctx, number>(saver, [
        (ctx) => {
          ctx.foo *= 2;
          return ctx.foo;
        },
      ]);
      expect(h({ foo: 42 }, () => NaN)).toBe(84);
    });

    it("should not use modified foo from first handler", () => {
      const h = someHandler<Ctx, number>(saver, [
        (ctx) => {
          ctx.foo *= 2;
          return undefined;
        },
        (ctx) => {
          ctx.foo *= 2;
          return ctx.foo;
        },
      ]);
      expect(h({ foo: 42 }, () => NaN)).toBe(84);
    });
  });
});
