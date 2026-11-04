import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "crypto";
import { decryptNote, encryptNote } from "./noteEncryption";

const owners = { therapistId: 1, patientId: 2 };
const original = process.env.NOTES_ENCRYPTION_KEY;

describe("noteEncryption", () => {
  beforeEach(() => {
    process.env.NOTES_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });
  afterEach(() => {
    process.env.NOTES_ENCRYPTION_KEY = original;
  });

  it("retrouve le texte, accents compris", () => {
    const text = "Séance difficile, évoquer le sommeil la prochaine fois 🌙";
    expect(decryptNote(encryptNote(text, owners), owners)).toBe(text);
  });

  it("ne laisse pas le texte lisible et varie à chaque chiffrement", () => {
    const a = encryptNote("sommeil", owners);
    expect(a).not.toContain("sommeil");
    expect(a).not.toBe(encryptNote("sommeil", owners));
  });

  it("refuse une note copiée sur un autre patient", () => {
    const stored = encryptNote("secret", owners);
    expect(() => decryptNote(stored, { therapistId: 1, patientId: 3 })).toThrow();
  });

  it("refuse une note modifiée", () => {
    const stored = encryptNote("secret", owners);
    const last = stored.at(-3) === "A" ? "B" : "A";
    expect(() => decryptNote(`${stored.slice(0, -3)}${last}${stored.slice(-2)}`, owners)).toThrow();
  });

  it("refuse une autre clé", () => {
    const stored = encryptNote("secret", owners);
    process.env.NOTES_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptNote(stored, owners)).toThrow();
  });

  it("n'écrit jamais en clair sans clé valide", () => {
    process.env.NOTES_ENCRYPTION_KEY = "";
    expect(() => encryptNote("secret", owners)).toThrow();
    process.env.NOTES_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encryptNote("secret", owners)).toThrow();
  });

  it("refuse une valeur en clair", () => {
    expect(() => decryptNote("texte en clair", owners)).toThrow();
  });
});
