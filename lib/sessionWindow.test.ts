import { describe, expect, it } from "vitest";
import { sessionPhase, sessionWindow } from "./sessionWindow";

const start = new Date("2026-11-20T10:00:00Z");

describe("sessionWindow", () => {
  it("ouvre 15 minutes avant et ferme au bout de la durée", () => {
    const w = sessionWindow(start, 60);
    expect(w.opensAt.toISOString()).toBe("2026-11-20T09:45:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-11-20T11:00:00.000Z");
  });

  it("retombe sur une heure si la durée manque", () => {
    expect(sessionWindow(start, 0).endsAt.toISOString()).toBe("2026-11-20T11:00:00.000Z");
  });

  it("donne la phase de la séance", () => {
    expect(sessionPhase(start, 60, new Date("2026-11-20T09:40:00Z"))).toBe("early");
    expect(sessionPhase(start, 60, new Date("2026-11-20T09:45:00Z"))).toBe("open");
    expect(sessionPhase(start, 60, new Date("2026-11-20T10:59:59Z"))).toBe("open");
    expect(sessionPhase(start, 60, new Date("2026-11-20T11:00:00Z"))).toBe("ended");
  });

  it("garde la durée réelle des séances déjà réservées (45 min)", () => {
    expect(sessionPhase(start, 45, new Date("2026-11-20T10:50:00Z"))).toBe("ended");
  });
});
