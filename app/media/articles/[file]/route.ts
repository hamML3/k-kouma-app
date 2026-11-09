import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ARTICLE_IMAGES_DIR, isArticleImageFilename } from "@/lib/articleImages";

// GET : image d'illustration d'un article. Publique comme le blog ; le nom
// (uuid) n'est jamais réutilisé, d'où une mise en cache longue.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isArticleImageFilename(file)) return new NextResponse("Introuvable", { status: 404 });

  let content: Buffer;
  try {
    content = await readFile(path.join(ARTICLE_IMAGES_DIR, file));
  } catch {
    return new NextResponse("Introuvable", { status: 404 });
  }

  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
