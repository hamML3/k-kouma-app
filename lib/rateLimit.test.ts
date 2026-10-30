import { describe, it, expect } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
  });

  it("blocks once the limit is exceeded, within the same window", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    const fourth = rateLimit(key, 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test:a:${Math.random()}`;
    const keyB = `test:b:${Math.random()}`;
    rateLimit(keyA, 1, 60_000);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("allows again once the window has passed", async () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 1, 30).allowed).toBe(true);
    expect(rateLimit(key, 1, 30).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 40));
    expect(rateLimit(key, 1, 30).allowed).toBe(true);
  });
});
