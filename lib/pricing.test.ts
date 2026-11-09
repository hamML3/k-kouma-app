import { describe, it, expect } from "vitest";
import { SESSION_PRICING, amountFor, resolveTherapyType, sessionsCountFor } from "./pricing";

describe("amountFor", () => {
  it("returns the single-session price for each therapy type", () => {
    expect(amountFor("individuelle", "single")).toBe(10000);
    expect(amountFor("couple", "single")).toBe(20000);
    expect(amountFor("enfant", "single")).toBe(8500);
  });

  it("returns the pack-of-3 price for each therapy type", () => {
    expect(amountFor("individuelle", "pack3")).toBe(28000);
    expect(amountFor("couple", "pack3")).toBe(57000);
    expect(amountFor("enfant", "pack3")).toBe(23500);
  });
});

describe("sessionsCountFor", () => {
  it("maps 'single' to 1 session and 'pack3' to 3", () => {
    expect(sessionsCountFor("single")).toBe(1);
    expect(sessionsCountFor("pack3")).toBe(3);
  });
});

describe("SESSION_PRICING — the promotional 'was' price must always be strictly higher than the current price", () => {
  for (const [type, entry] of Object.entries(SESSION_PRICING)) {
    it(`${type}: pack3Was (if set) > pack3`, () => {
      if (entry.pack3Was !== undefined) {
        expect(entry.pack3Was).toBeGreaterThan(entry.pack3);
      }
    });
  }
});

describe("coaching", () => {
  it("garde le tarif de la séance individuelle", () => {
    expect(SESSION_PRICING.coaching.single).toBe(SESSION_PRICING.individuelle.single);
    expect(SESSION_PRICING.coaching.pack3).toBe(SESSION_PRICING.individuelle.pack3);
  });

  it("est reconnu depuis le questionnaire", () => {
    expect(resolveTherapyType({ therapyType: "coaching" })).toBe("coaching");
  });
});

describe("resolveTherapyType avec un type choisi à l'achat", () => {
  it("prend le type choisi quand le questionnaire n'est pas rempli", () => {
    expect(resolveTherapyType(null, "couple")).toBe("couple");
    expect(resolveTherapyType({}, "enfant")).toBe("enfant");
  });

  it("le questionnaire l'emporte sur le type choisi", () => {
    expect(resolveTherapyType({ therapyType: "individuelle" }, "couple")).toBe("individuelle");
  });

  it("ignore une valeur inconnue et retombe sur individuelle", () => {
    expect(resolveTherapyType(null, "vip")).toBe("individuelle");
    expect(resolveTherapyType(null, null)).toBe("individuelle");
  });
});
