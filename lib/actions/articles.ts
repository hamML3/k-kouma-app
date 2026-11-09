'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { proposeArticleSchema } from "@/lib/validators/articles";

export type ProposeArticleState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  /** true si publié directement (admin) plutôt qu'envoyé en attente de relecture. */
  published?: boolean;
  /** true si une proposition existante a été modifiée. */
  edited?: boolean;
};

// Le middleware (proxy.ts) laisse volontairement passer les Server Actions
// sans vérifier la session — chaque action doit donc faire ce contrôle
// elle-même avant toute lecture/écriture sensible (voir lib/actions/admin.ts).

/**
 * Thérapeute ou modérateur : *proposent* un article, qui attend la relecture
 * admin (voir requireAdmin() ci-dessous). Admin : publie directement, sans
 * passer par sa propre file — il porte déjà la responsabilité finale du
 * contenu de la plateforme, une auto-validation n'ajouterait rien.
 * `patient` n'a jamais accès à cette fonctionnalité.
 */
async function requireArticleAuthor(): Promise<{ id: number; email: string; role: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.email || (role !== "therapist" && role !== "moderator" && role !== "admin")) {
    throw new Error("Accès refusé.");
  }
  const id = Number(session.user.id);
  // Un praticien dont le dossier n'est pas encore validé ne publie rien au
  // nom de K-Kouma (même règle que pour recevoir des patients).
  if (role === "therapist" && !(await isVerifiedPractitioner(id))) {
    throw new Error("Accès refusé.");
  }
  return { id, email: session.user.email, role };
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

async function isVerifiedPractitioner(userId: number): Promise<boolean> {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId }, select: { isVerified: true } });
  return profile?.isVerified ?? false;
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

/**
 * Crée une proposition d'article, ou modifie l'une des siennes (champ
 * `articleId`) tant qu'elle n'est pas publiée : une proposition refusée
 * repart alors en relecture avec ses corrections.
 */
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
  const isAdmin = author.role === "admin";

  const editId = Number(formData.get("articleId")) || null;
  if (editId) {
    const existing = await prisma.submittedArticle.findUnique({ where: { id: editId } });
    // L'auteur ne modifie que ses propres propositions non publiées.
    if (!existing || existing.authorId !== author.id || existing.status === "published") {
      return { error: "Cet article ne peut plus être modifié." };
    }
    await prisma.submittedArticle.update({
      where: { id: editId },
      data: {
        title,
        excerpt,
        body,
        imageUrl: imageUrl || null,
        status: isAdmin ? "published" : "pending",
        reviewNote: null,
        reviewedById: isAdmin ? author.id : null,
        reviewedAt: isAdmin ? new Date() : null,
      },
    });
    await logAudit({
      actor: author,
      action: isAdmin ? "article.publish" : "article.resubmit",
      targetType: "submitted_article",
      targetId: editId,
      metadata: { title, slug: existing.slug },
    });
    if (!isAdmin) {
      await notifyAdmins({
        type: "article.proposed",
        title: existing.status === "rejected" ? "Article corrigé à relire" : "Article modifié à relire",
        body: title,
        link: "/admin/articles",
        alert: { articleTitle: title },
      });
    }
    revalidatePath("/articles/proposer");
    revalidatePath("/admin/articles");
    if (isAdmin) {
      revalidatePath("/blog");
      revalidatePath(`/blog/${existing.slug}`);
    }
    return { success: true, published: isAdmin, edited: true };
  }

  const slug = await ensureUniqueSlug(slugify(title));

  // L'admin porte la responsabilité finale de la plateforme : il publie
  // directement, sans passer par sa propre file de relecture. Thérapeutes
  // et modérateurs, eux, restent toujours soumis à la validation admin.

  const created = await prisma.submittedArticle.create({
    data: {
      authorId: author.id,
      slug,
      title,
      excerpt,
      body,
      imageUrl: imageUrl || null,
      status: isAdmin ? "published" : "pending",
      ...(isAdmin && { reviewedById: author.id, reviewedAt: new Date() }),
    },
  });

  await logAudit({
    actor: author,
    action: isAdmin ? "article.publish" : "article.propose",
    targetType: "submitted_article",
    targetId: created.id,
    metadata: { title, slug },
  });

  if (!isAdmin) {
    await notifyAdmins({
      type: "article.proposed",
      title: "Nouvel article à relire",
      body: title,
      link: "/admin/articles",
      alert: { articleTitle: title },
    });
  }

  revalidatePath("/articles/proposer");
  if (isAdmin) {
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/dashboard");
  }
  return { success: true, published: isAdmin };
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
    data: { status: "published", reviewNote: null, reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({
    actor: admin,
    action: "article.publish",
    targetType: "submitted_article",
    targetId: articleId,
    metadata: { slug: article.slug, title: article.title },
  });

  await createNotification({
    userId: article.authorId,
    type: "article.published",
    title: "Votre article est publié",
    body: article.title,
    link: `/blog/${article.slug}`,
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
  const reviewNote = ((formData.get("reviewNote") as string) ?? "").trim().slice(0, 500) || null;

  await prisma.submittedArticle.update({
    where: { id: articleId },
    data: { status: "rejected", reviewNote, reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({
    actor: admin,
    action: "article.reject",
    targetType: "submitted_article",
    targetId: articleId,
    metadata: { slug: article.slug, title: article.title, reviewNote },
  });

  await createNotification({
    userId: article.authorId,
    type: "article.rejected",
    title: "Article à revoir",
    body: reviewNote ? `${article.title} : ${reviewNote}` : `${article.title}. Vous pouvez le modifier et le renvoyer.`,
    link: "/articles/proposer",
  });

  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}
