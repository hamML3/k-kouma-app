import path from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import sharp from "sharp";

// Images d'illustration des articles, envoyées depuis l'ordinateur ou le
// téléphone de l'auteur. Hors de public/ (Next ne sert que les fichiers
// présents au moment du build) : servies par app/media/articles/[file].
export const ARTICLE_IMAGES_DIR = path.join(process.cwd(), "storage", "article-images");
const ARTICLE_IMAGES_ROUTE = "/media/articles";

/** Le navigateur réduit l'image avant l'envoi ; cette limite couvre un envoi sans réduction. */
export const MAX_ARTICLE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 1600;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** Type réel d'après les premiers octets : ni le nom ni le type annoncé par le navigateur ne prouvent rien. */
export function isSupportedImage(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, [0xff, 0xd8, 0xff]) || // JPEG
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) // WebP
  );
}

/** Nom généré par l'app (uuid.jpg) : refuse toute remontée de dossier et tout autre fichier. */
export function isArticleImageFilename(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/.test(name);
}

export function articleImageUrl(filename: string): string {
  return `${ARTICLE_IMAGES_ROUTE}/${filename}`;
}

/** Fichier local derrière une adresse /media/articles/…, ou null pour une ancienne URL externe. */
export function localArticleImageFile(url: string | null | undefined): string | null {
  if (!url?.startsWith(`${ARTICLE_IMAGES_ROUTE}/`)) return null;
  const file = url.slice(ARTICLE_IMAGES_ROUTE.length + 1);
  return isArticleImageFilename(file) ? file : null;
}

export class ArticleImageError extends Error {}

/**
 * Valide, redresse, réduit (1600 px au plus) et réencode l'image en JPEG.
 * Le réencodage retire les métadonnées, dont la position GPS que les
 * téléphones inscrivent dans leurs photos. Renvoie l'adresse publique.
 */
export async function saveArticleImage(file: File): Promise<string> {
  if (file.size > MAX_ARTICLE_IMAGE_BYTES) {
    throw new ArticleImageError("Image trop lourde (8 Mo au maximum).");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isSupportedImage(bytes)) {
    throw new ArticleImageError("Format non pris en charge : choisissez une image JPEG, PNG ou WebP.");
  }

  let output: Buffer;
  try {
    output = await sharp(bytes, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new ArticleImageError("Cette image n'a pas pu être lue. Essayez avec une autre.");
  }

  const filename = `${randomUUID()}.jpg`;
  await mkdir(ARTICLE_IMAGES_DIR, { recursive: true });
  await writeFile(path.join(ARTICLE_IMAGES_DIR, filename), output);
  return articleImageUrl(filename);
}

/** Supprime une image locale qui n'est plus utilisée ; sans effet sur une ancienne URL externe. */
export async function deleteArticleImage(url: string | null | undefined): Promise<void> {
  const file = localArticleImageFile(url);
  if (!file) return;
  await unlink(path.join(ARTICLE_IMAGES_DIR, file)).catch(() => {});
}
