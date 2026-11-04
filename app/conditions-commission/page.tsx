import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { acceptCommissionTermsAction } from "@/lib/actions/commission";
import { effectiveCommissionPercent, needsCommissionAcceptance } from "@/lib/commission";

export const metadata = { title: "Conditions de commission — K-Kouma" };

export default async function CommissionTermsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const userId = Number(session.user.id);

  const [profile, settings] = await Promise.all([
    prisma.therapistProfile.findUnique({
      where: { userId },
      select: { commissionPercent: true, commissionAcceptedPercent: true, commissionAcceptedAt: true },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!profile) redirect("/dashboard");

  const effective = effectiveCommissionPercent(
    profile.commissionPercent ? Number(profile.commissionPercent) : null,
    Number(settings?.defaultCommissionPercent ?? 20)
  );
  const needsAcceptance = needsCommissionAcceptance(
    effective,
    profile.commissionAcceptedPercent ? Number(profile.commissionAcceptedPercent) : null
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: "var(--kk-bg)" }}>
      <div className="w-full max-w-md rounded-2xl p-7" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        <Logo size={24} />
        <h1 className="text-2xl font-bold mt-5 mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Conditions de commission
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
          Les tarifs patients sont fixés par K-Kouma (abonnements et packs de séances). Pour chaque séance que vous
          réalisez, K-Kouma prélève une commission sur le prix payé par le patient et vous reverse le reste.
        </p>

        <div
          className="rounded-2xl p-5 mb-6 text-center"
          style={{ background: "var(--kk-green-light)", border: "1.5px solid #C2D9BC" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green)" }}>
            Commission applicable
          </p>
          <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            {effective}%
          </p>
        </div>

        {needsAcceptance ? (
          <>
            <p className="text-xs mb-4" style={{ color: "var(--kk-faint)" }}>
              {profile.commissionAcceptedAt
                ? `Ce pourcentage a changé depuis votre dernière acceptation (${Number(profile.commissionAcceptedPercent)}% le ${new Date(profile.commissionAcceptedAt).toLocaleDateString("fr-FR")}). Merci d'accepter les nouvelles conditions pour continuer.`
                : "Merci d'accepter ces conditions pour accéder à votre espace."}
            </p>
            <form action={acceptCommissionTermsAction}>
              <button type="submit" className="kk-btn-green w-full">
                J&apos;accepte ces conditions
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-center font-semibold" style={{ color: "var(--kk-green)" }}>
            ✓ Conditions acceptées le {new Date(profile.commissionAcceptedAt!).toLocaleDateString("fr-FR")}
          </p>
        )}
      </div>
    </div>
  );
}
