import { describe, expect, it } from "vitest";
import { articleByline } from "./articleAuthor";

const profile = { id: 7, firstName: "Aminata", lastName: "Coulibaly", practitionerKind: "psychologist" as const, isVerified: true };

describe("articleByline", () => {
  it("signe du nom et du métier du praticien, avec lien vers son profil", () => {
    expect(articleByline({ role: "therapist", therapistProfile: profile })).toEqual({
      name: "Aminata Coulibaly",
      title: "Psychologue clinicien",
      profileHref: "/therapists/7",
    });
  });

  it("indique le métier de coach", () => {
    expect(articleByline({ role: "therapist", therapistProfile: { ...profile, practitionerKind: "coach" } }).title).toBe("Coach de vie");
  });

  it("ne met pas de lien vers un profil non vérifié", () => {
    expect(articleByline({ role: "therapist", therapistProfile: { ...profile, isVerified: false } }).profileHref).toBeNull();
  });

  it("signe « L'équipe K-Kouma » pour un admin ou un modérateur", () => {
    expect(articleByline({ role: "admin", therapistProfile: null }).name).toBe("L'équipe K-Kouma");
    expect(articleByline({ role: "moderator", therapistProfile: null }).name).toBe("L'équipe K-Kouma");
  });
});
