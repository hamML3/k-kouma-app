import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import {
  DOCUMENTS_DIR,
  LEGACY_DOCUMENTS_DIR,
  detectDocumentType,
  isDocumentFilename,
} from "@/lib/therapistDocuments";

async function readDocument(file: string): Promise<Buffer | null> {
  for (const dir of [DOCUMENTS_DIR, LEGACY_DOCUMENTS_DIR]) {
    try {
      return await readFile(path.join(dir, file));
    } catch {
      // absent de ce dossier : on essaie le suivant
    }
  }
  return null;
}

// GET : diplôme ou pièce d'identité d'un candidat — réservé à qui peut examiner les dossiers.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, "manage_therapists")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { file } = await params;
  if (!isDocumentFilename(file)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const content = await readDocument(file);
  const type = content && detectDocumentType(content);
  if (!content || !type) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await logAudit({
    actor: { id: Number(session.user.id), email: session.user.email },
    action: "admin.therapist.document_view",
    metadata: { file },
  });

  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": type.contentType,
      "Content-Disposition": `inline; filename="${file}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
