import { describe, it, expect } from "vitest";
import { splitSpecialties, normalizeSpecialties, MAX_SPECIALTIES, SPECIALTIES } from "./specialties";

describe("splitSpecialties", () => {
  it("handles both ',' and ', ' separators, trims, drops empties and duplicates", () => {
    expect(splitSpecialties("Dépression, Addictions,,Dépression ,  ")).toEqual(["Dépression", "Addictions"]);
  });

  it("returns an empty list for null/empty input", () => {
    expect(splitSpecialties(null)).toEqual([]);
    expect(splitSpecialties("")).toEqual([]);
  });

  it("accepts an array input", () => {
    expect(splitSpecialties(["Dépression", "Addictions, Dépression"])).toEqual(["Dépression", "Addictions"]);
  });
});

describe("normalizeSpecialties", () => {
  it("re-joins valid values with ',' and no space", () => {
    const r = normalizeSpecialties("Anxiété et stress, Traumatisme (PTSD)");
    expect(r).toEqual({
      ok: true,
      list: ["Anxiété et stress", "Traumatisme (PTSD)"],
      value: "Anxiété et stress,Traumatisme (PTSD)",
    });
  });

  it("rejects unknown values", () => {
    const r = normalizeSpecialties("Dépression, Hypnose miracle");
    expect(r.ok).toBe(false);
  });

  it("requires at least one value", () => {
    expect(normalizeSpecialties("").ok).toBe(false);
    expect(normalizeSpecialties(undefined).ok).toBe(false);
  });

  it(`rejects more than ${MAX_SPECIALTIES} values`, () => {
    const tooMany = SPECIALTIES.slice(0, MAX_SPECIALTIES + 1).join(",");
    expect(normalizeSpecialties(tooMany).ok).toBe(false);
    expect(normalizeSpecialties(SPECIALTIES.slice(0, MAX_SPECIALTIES).join(",")).ok).toBe(true);
  });

  it("counts duplicates once", () => {
    const r = normalizeSpecialties(Array(MAX_SPECIALTIES + 2).fill("Dépression").join(","));
    expect(r).toMatchObject({ ok: true, value: "Dépression" });
  });

  it("accepts grandfathered legacy values via extraAllowed", () => {
    expect(normalizeSpecialties("Couples,Dépression").ok).toBe(false);
    expect(normalizeSpecialties("Couples,Dépression", { extraAllowed: ["Couples"] })).toMatchObject({
      ok: true,
      value: "Couples,Dépression",
    });
  });
});

describe("spécialités par métier", () => {
  it("accepte une spécialité de coach pour un coach", () => {
    expect(normalizeSpecialties("Confiance en soi", { kind: "coach" }).ok).toBe(true);
  });

  it("refuse une spécialité clinique pour un coach", () => {
    expect(normalizeSpecialties("Dépression", { kind: "coach" }).ok).toBe(false);
  });

  it("garde la liste des psychologues par défaut", () => {
    expect(normalizeSpecialties("Dépression").ok).toBe(true);
    expect(normalizeSpecialties("Carrière et orientation").ok).toBe(false);
  });
});
