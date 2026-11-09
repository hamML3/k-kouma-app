import { PRACTITIONER_TITLES, type PractitionerKind } from "@/lib/practitioners";

/** Champs à sélectionner sur l'auteur d'un article proposé pour signer l'article. */
export const ARTICLE_AUTHOR_SELECT = {
  role: true,
  therapistProfile: {
    select: { id: true, firstName: true, lastName: true, practitionerKind: true, isVerified: true },
  },
} as const;

export type ArticleAuthor = {
  role: string;
  therapistProfile: {
    id: number;
    firstName: string;
    lastName: string;
    practitionerKind: PractitionerKind;
    isVerified: boolean;
  } | null;
};

export type ArticleByline = { name: string; title: string | null; profileHref: string | null };

/**
 * Signature publique d'un article : nom et métier du praticien, avec un lien
 * vers son profil s'il est vérifié. Un article écrit par un admin ou un
 * modérateur est signé « L'équipe K-Kouma » : leur adresse e-mail ne doit
 * jamais apparaître sur le blog.
 */
export function articleByline(author: ArticleAuthor): ArticleByline {
  const p = author.therapistProfile;
  if (author.role !== "therapist" || !p) {
    return { name: "L'équipe K-Kouma", title: null, profileHref: null };
  }
  return {
    name: `${p.firstName} ${p.lastName}`.trim(),
    title: PRACTITIONER_TITLES[p.practitionerKind],
    profileHref: p.isVerified ? `/therapists/${p.id}` : null,
  };
}
