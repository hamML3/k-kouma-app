import { describe, it, expect } from "vitest";
import { SESSION_PRICING, amountFor, sessionsCountFor } from "./pricing";

describe("amountFor", () => {
  it("returns the single-session price for each therapy type", () => {
    expect(amountFor("individuelle", "single")).toBe(10000);
    expect(amountFor("couple", "single")).toBe(16000);
    expect(amountFor("enfant", "single")).toBe(8500);
  });

  it("returns the pack-of-4 price for each therapy type", () => {
    expect(amountFor("individuelle", "pack4")).toBe(32000);
    expect(amountFor("couple", "pack4")).toBe(60000);
    expect(amountFor("enfant", "pack4")).toBe(30000);
  });
});

describe("sessionsCountFor", () => {
  it("maps 'single' to 1 session and 'pack4' to 4", () => {
    expect(sessionsCountFor("single")).toBe(1);
    expect(sessionsCountFor("pack4")).toBe(4);
  });
});

describe("SESSION_PRICING — the promotional 'was' price must always be strictly higher than the current price", () => {
  for (const [type, entry] of Object.entries(SESSION_PRICING)) {
    it(`${type}: pack4Was (if set) > pack4`, () => {
      if (entry.pack4Was !== undefined) {
        expect(entry.pack4Was).toBeGreaterThan(entry.pack4);
      }
    });
  }
});
