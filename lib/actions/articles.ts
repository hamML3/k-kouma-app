'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { proposeArticleSchema } from "@/lib/validators/articles";

export type ProposeArticleState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

// Le middleware (proxy.ts) laisse volontairement passer les Server Actions
// sans vérifier la session — chaque action doit donc faire ce contrôle
// elle-même avant toute lecture/écriture sensible (voir lib/actions/admin.ts).

/**
 * Thérapeute, modérateur ou admin : tous peuvent *proposer* un article —
 * seule la relecture (publication/rejet) est réservée à l'admin, voir
 * requireAdmin() ci-dessous. `patient` n'a jamais accès à cette fonctionnalité.
 */
async function requireArticleAuthor(): Promise<{ id: number; email: string; role: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.email || (role !== "therapist" && role !== "moderator" && role !== "admin")) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email, role };
}

/**
 * Validation (publication/rejet) volontairement réservée au véritable admin,
 * comme les réglages de plateforme (lib/actions/settings.ts) — pas de
 * permission `manage_articles` déléguée à un modérateur pour l'instant : un
 * contenu de santé mentale mérite une relecture par le compte qui porte la
 * responsabilité finale de la plateforme, pas un sous-ensemble configurable.
 */
async function requireAdmin(): Promise<{ id: number; email: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    throw new Error("Accès refusé : réservé aux administrateurs.");
  }
  return { id: Number(session.user.id), email: session.user.email };
}

function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "article";
}

/** Garantit l'unicité du slug en ajoutant un suffixe numérique en cas de collision. */
async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base.slice(0, 100);
  let suffix = 2;
  while (true) {
    const existing = await prisma.submittedArticle.findUnique({ where: { slug } });
    if (!existing) return slug;
    const candidate = `${base}-${suffix}`;
    slug = candidate.slice(0, 100);
    suffix += 1;
  }
}

/** Crée une proposition d'article, en attente de relecture admin. */
export async function proposeArticleAction(
  _prevState: ProposeArticleState,
  formData: FormData
): Promise<ProposeArticleState> {
  let author: { id: number; email: string; role: string };
  try {
    author = await requireArticleAuthor();
  } catch {
    return { error: "Accès refusé." };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    excerpt: (formData.get("excerpt") as string) ?? "",
    body: (formData.get("body") as string) ?? "",
    imageUrl: (formData.get("imageUrl") as string) ?? "",
  };

  const parsed = proposeArticleSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, excerpt, body, imageUrl } = parsed.data;

  const slug = await ensureUniqueSlug(slugify(title));

  const created = await prisma.submittedArticle.create({
    data: {
      authorId: author.id,
      slug,
      title,
      excerpt,
      body,
      imageUrl: imageUrl || null,
      status: "pending",
    },
  });

  await logAudit({
    actor: author,
    action: "article.propose",
    targetType: "submitted_article",
    targetId: created.id,
    metadata: { title, slug },
  });

  revalidatePath("/articles/proposer");
  return { success: true };
}

/** Publie une proposition d'article — réservé à l'admin (voir requireAdmin). */
export async function publishArticleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const articleId = Number(formData.get("articleId"));
  if (!articleId) redirect("/admin/articles");

  const article = await prisma.submittedArticle.findUnique({ where: { id: articleId } });
  if (!article || article.status !== "pending") redirect("/admin/articles");

  await prisma.submittedArticle.update({
    where: { id: articleId },
    data: { status: "published", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({
    actor: admin,
    action: "article.publish",
    targetType: "submitted_article",
    targetId: articleId,
    metadata: { slug: article.slug, title: article.title },
  });

  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  revalidatePath(`/blog/${article.slug}`);
  revalidatePath("/dashboard");
  redirect("/admin/articles");
}

/** Rejette une proposition d'article — réservé à l'admin (voir requireAdmin). */
export async function rejectArticleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const articleId = Number(formData.get("articleId"));
  if (!articleId) redirect("/admin/articles");

  const article = await prisma.submittedArticle.findUnique({ where: { id: articleId } });
  if (!article || article.status !== "pending") redirect("/admin/articles");

  await prisma.submittedArticle.update({
    where: { id: articleId },
    data: { status: "rejected", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({
    actor: admin,
    action: "article.reject",
    targetType: "submitted_article",
    targetId: articleId,
    metadata: { slug: article.slug, title: article.title },
  });

  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}
