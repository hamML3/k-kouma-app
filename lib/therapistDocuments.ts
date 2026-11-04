import path from "path";

// Diplômes et pièces d'identité : hors de public/, servis uniquement par
// app/api/admin/therapist-documents/[file]/route.ts après contrôle des droits.
export const DOCUMENTS_DIR = path.join(process.cwd(), "storage", "therapist-documents");
export const LEGACY_DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "diplomas");
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const DOCUMENTS_ROUTE = "/api/admin/therapist-documents";

export type DocumentType = { ext: "pdf" | "png" | "jpg"; contentType: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

/** Type réel d'après les premiers octets — le type MIME et le nom envoyés par le client ne prouvent rien. */
export function detectDocumentType(bytes: Uint8Array): DocumentType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return { ext: "pdf", contentType: "application/pdf" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", contentType: "image/png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  return null;
}

/** Nom généré par l'app (uuid + extension) : refuse toute remontée de dossier et tout autre fichier. */
export function isDocumentFilename(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpe?g)$/i.test(name);
}

export function documentUrl(filename: string): string {
  return `${DOCUMENTS_ROUTE}/${filename}`;
}

/** Accepte aussi les anciennes adresses en base (/uploads/diplomas/<fichier>). */
export function documentHref(storedUrl: string): string {
  return documentUrl(storedUrl.split("/").pop() ?? "");
}
