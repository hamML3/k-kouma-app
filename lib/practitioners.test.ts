import { describe, expect, it } from "vitest";
import { canChooseCoach, coachNeedsQuestionnaire } from "./practitioners";

describe("canChooseCoach", () => {
  it("autorise un adulte sans signal de risque", () => {
    expect(canChooseCoach({ safety: "non", therapyType: "individuelle" })).toBe(true);
    expect(canChooseCoach({ safety: "non", therapyType: "couple" })).toBe(true);
  });

  it("refuse tant que la question de sécurité n'a pas de réponse", () => {
    expect(canChooseCoach(null)).toBe(false);
    expect(canChooseCoach(undefined)).toBe(false);
    expect(canChooseCoach({ therapyType: "couple" })).toBe(false);
    expect(coachNeedsQuestionnaire(null)).toBe(true);
    expect(coachNeedsQuestionnaire({ safety: "oui" })).toBe(false);
  });

  it("écarte tout signal de risque", () => {
    expect(canChooseCoach({ safety: "oui" })).toBe(false);
    expect(canChooseCoach({ safety: "parfois" })).toBe(false);
  });

  it("écarte les mineurs", () => {
    expect(canChooseCoach({ safety: "non", therapyType: "enfant" })).toBe(false);
  });
});
