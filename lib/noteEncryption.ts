import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type NoteOwners = { therapistId: number; patientId: number };

function encryptionKey(): Buffer {
  const key = Buffer.from(process.env.NOTES_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("NOTES_ENCRYPTION_KEY absente ou invalide (32 octets en base64 attendus).");
  }
  return key;
}

// Lie le chiffré à sa ligne : copié sur un autre couple psychologue-patient en
// base, il ne se déchiffre plus.
function additionalData({ therapistId, patientId }: NoteOwners): Buffer {
  return Buffer.from(`therapist-note:${therapistId}:${patientId}`);
}

/**
 * Chiffre un texte (AES-256-GCM) lié à son contexte : `context` sert de
 * donnée authentifiée, si bien qu'un chiffré recopié ailleurs (autre note,
 * autre conversation) ne se déchiffre plus. Lève une erreur si la clé manque.
 */
export function encryptText(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/** Lève une erreur si la clé manque ou diffère, si le contexte diffère ou si la valeur a été modifiée. */
export function decryptText(stored: string, context: string): string {
  if (!stored.startsWith(PREFIX)) throw new Error("Texte non chiffré ou format inconnu.");
  const data = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, IV_BYTES));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(data.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}

/** Lève une erreur si la clé manque : une note ne doit jamais partir en clair. */
export function encryptNote(plaintext: string, owners: NoteOwners): string {
  return encryptText(plaintext, additionalData(owners).toString());
}

/** Lève une erreur si la clé manque ou diffère, ou si la valeur a été modifiée. */
export function decryptNote(stored: string, owners: NoteOwners): string {
  if (!stored.startsWith(PREFIX)) throw new Error("Note non chiffrée ou format inconnu.");
  return decryptText(stored, additionalData(owners).toString());
}
