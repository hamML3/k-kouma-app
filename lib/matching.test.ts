import { describe, it, expect } from "vitest";
import { scoreTherapist, matchBadge, type TherapistForMatching } from "./matching";

function therapist(overrides: Partial<TherapistForMatching> = {}): TherapistForMatching {
  return {
    id: 1,
    userId: 1,
    firstName: "Test",
    lastName: "Therapist",
    specialties: null,
    bio: null,
    languages: null,
    ...overrides,
  };
}

describe("scoreTherapist", () => {
  it("gives zero score and no reasons when nothing matches", () => {
    const result = scoreTherapist({}, therapist());
    expect(result.score).toBe(0);
    expect(result.pct).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("rewards a language match", () => {
    const result = scoreTherapist(
      { langue: "bambara" },
      therapist({ languages: "Français,Bambara" })
    );
    expect(result.score).toBe(40);
    expect(result.reasons).toContain("Parle Bambara");
  });

  it("does not reward a language the therapist doesn't speak", () => {
    const result = scoreTherapist(
      { langue: "peulh" },
      therapist({ languages: "Français,Bambara" })
    );
    expect(result.score).toBe(0);
  });

  it("gives partial credit for a multilingual therapist when the patient has no language preference", () => {
    const result = scoreTherapist(
      { langue: "peuimporte" },
      therapist({ languages: "Français,Bambara,Peulh" })
    );
    expect(result.score).toBe(15);
    expect(result.reasons).toContain("Multilingue");
  });

  it("matches motifs against specialties, up to 3", () => {
    const result = scoreTherapist(
      { motifs: ["anxiete", "humeur", "sommeil", "deuil"] }, // 4 motifs — only 3 should count
      therapist({ specialties: "Anxiété et stress,Dépression,Troubles du sommeil,Deuil et perte" })
    );
    expect(result.score).toBe(45); // 3 × 15
    expect(result.reasons).toHaveLength(3);
  });

  it("matches therapy type for couple/enfant but not individuelle", () => {
    const couple = scoreTherapist(
      { therapyType: "couple" },
      therapist({ specialties: "Relations et couple" })
    );
    expect(couple.score).toBe(15);
    expect(couple.reasons).toContain("Thérapie de couple");

    const individuelle = scoreTherapist(
      { therapyType: "individuelle" },
      therapist({ specialties: "Relations et couple" })
    );
    expect(individuelle.score).toBe(0);
  });

  it("boosts therapists with crisis-related specialties when the patient flagged safety concerns", () => {
    const atRisk = scoreTherapist(
      { safety: "oui" },
      therapist({ specialties: "Traumatisme (PTSD)" })
    );
    expect(atRisk.score).toBe(10);
    expect(atRisk.reasons).toContain("Spécialisé soutien de crise");

    const notAtRisk = scoreTherapist(
      { safety: "non" },
      therapist({ specialties: "Traumatisme (PTSD)" })
    );
    expect(notAtRisk.score).toBe(0);
  });

  it("rewards profile completeness (a sufficiently long bio)", () => {
    const result = scoreTherapist(
      {},
      therapist({ bio: "A".repeat(60) })
    );
    expect(result.score).toBe(5); // 5 (bio)
  });

  it("does not reward a short bio", () => {
    const result = scoreTherapist({}, therapist({ bio: "Too short" }));
    expect(result.score).toBe(0);
  });

  it("caps the displayed percentage at 100 even with every bonus stacked", () => {
    const result = scoreTherapist(
      { langue: "francais", motifs: ["anxiete", "humeur", "deuil"], therapyType: "couple", safety: "oui" },
      therapist({
        languages: "Français",
        specialties: "Anxiété et stress,Dépression,Deuil et perte,Relations et couple,Traumatisme",
        bio: "A".repeat(60),
      })
    );
    expect(result.pct).toBeLessThanOrEqual(100);
  });
});

describe("matchBadge", () => {
  it("picks the right tier for each percentage band", () => {
    expect(matchBadge(85).label).toBe("85% compatible");
    expect(matchBadge(60).label).toBe("60% compatible");
    expect(matchBadge(25).label).toBe("25% compatible");
    expect(matchBadge(5).label).toBe("Profil général");
  });
});

describe("coaching", () => {
  it("met en avant un coach pour une demande de coaching", () => {
    const coach = scoreTherapist({ therapyType: "coaching" }, therapist({ practitionerKind: "coach" }));
    const psychologist = scoreTherapist({ therapyType: "coaching" }, therapist({ practitionerKind: "psychologist" }));
    expect(coach.score).toBeGreaterThan(psychologist.score);
    expect(coach.reasons).toContain("Coaching de vie");
  });

  it("ne favorise pas un coach pour une thérapie", () => {
    const coach = scoreTherapist({ therapyType: "individuelle" }, therapist({ practitionerKind: "coach" }));
    const psychologist = scoreTherapist({ therapyType: "individuelle" }, therapist({ practitionerKind: "psychologist" }));
    expect(coach.score).toBe(psychologist.score);
  });
});
