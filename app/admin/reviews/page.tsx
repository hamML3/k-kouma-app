import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { hideReviewAction, publishReviewAction } from "@/lib/actions/reviews";
import type { ReviewStatus } from "@prisma/client";

export const metadata = { title: "Avis — Administration K-Kouma" };

const STATUS_TABS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "À relire" },
  { value: "published", label: "Publiés" },
  { value: "hidden", label: "Masqués" },
];

/** Même accès que /admin/reports : un commentaire peut contenir des détails de santé. */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!hasPermission(session?.user?.role, session?.user?.permissions, "manage_reports")) redirect("/admin");

  const { status: statusParam } = await searchParams;
  const status = STATUS_TABS.find((t) => t.value === statusParam)?.value ?? "pending";

  const reviews = await prisma.sessionReview.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      therapist: { select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Avis
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Un avis n&apos;apparaît sur le profil du psychologue qu&apos;une fois publié, toujours sans le nom du patient.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <Link
              key={t.value}
              href={`/admin/reviews?status=${t.value}`}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
              style={{
                background: active ? "var(--kk-purple)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {reviews.length === 0 ? (
        <div className="kk-card p-10 text-center">
          <p className="text-3xl mb-3" aria-hidden>
            ⭐
          </p>
          <p className="font-semibold" style={{ color: "var(--kk-dark)" }}>
            Aucun avis ici
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Les avis laissés après une séance arrivent dans cet onglet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const profile = r.therapist.therapistProfile;
            return (
              <div key={r.id} className="kk-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                    {profile ? `${profile.firstName} ${profile.lastName}` : r.therapist.email}
                  </p>
                  <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }} aria-label={`${r.rating} sur 5`}>
                    <span aria-hidden style={{ color: "var(--kk-gold-text)" }}>★</span> {r.rating}/5
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--kk-mid)" }}>
                  {r.comment ?? "Pas de commentaire."}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                  <p className="text-xs" style={{ color: "var(--kk-muted)" }}>
                    {r.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex gap-2">
                    {r.status !== "hidden" && (
                      <form action={hideReviewAction}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-border-mid)]"
                          style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                        >
                          Masquer
                        </button>
                      </form>
                    )}
                    {r.status !== "published" && (
                      <form action={publishReviewAction}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-green-hover)]"
                          style={{ background: "var(--kk-green)", color: "#fff" }}
                        >
                          Publier
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
