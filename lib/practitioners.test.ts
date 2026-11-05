import { describe, expect, it } from "vitest";
import { canChooseCoach } from "./practitioners";

describe("canChooseCoach", () => {
  it("autorise un adulte sans signal de risque", () => {
    expect(canChooseCoach({ safety: "non", therapyType: "individuelle" })).toBe(true);
    expect(canChooseCoach({ therapyType: "couple" })).toBe(true);
  });

  it("autorise un patient qui n'a pas encore répondu au questionnaire", () => {
    expect(canChooseCoach(null)).toBe(true);
    expect(canChooseCoach(undefined)).toBe(true);
  });

  it("écarte tout signal de risque", () => {
    expect(canChooseCoach({ safety: "oui" })).toBe(false);
    expect(canChooseCoach({ safety: "parfois" })).toBe(false);
  });

  it("écarte les mineurs", () => {
    expect(canChooseCoach({ safety: "non", therapyType: "enfant" })).toBe(false);
  });
});
