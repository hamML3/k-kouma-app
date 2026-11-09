import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/ChangeEmailForm";
import { prisma } from "@/lib/prisma";
import { updateMarketingPreferenceAction } from "@/lib/actions/marketing";

export const metadata = { title: "Mon compte — K-Kouma" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ preferences?: string }> }) {
  const { preferences } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin" || session.user.role === "moderator") redirect("/admin/compte");
  // L'adresse vient de la base : celle de la session peut dater d'avant un changement.
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { email: true, pendingEmail: true, marketingOptOutAt: true },
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      <main className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <ChangePasswordForm email={user?.email ?? session.user.email ?? ""} />
        <ChangeEmailForm currentEmail={user?.email ?? session.user.email ?? ""} pendingEmail={user?.pendingEmail ?? null} />
        <div className="kk-card p-6">
          <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            E-mails de K-Kouma
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--kk-muted)" }}>
            Les messages liés à votre compte (rendez-vous, paiements, sécurité) sont toujours envoyés.
          </p>
          {preferences === "ok" && (
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--kk-green-text)" }}>
              Préférence enregistrée.
            </p>
          )}
          <form action={updateMarketingPreferenceAction} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="marketing" defaultChecked={!user?.marketingOptOutAt} />
              Recevoir les actualités et offres de K-Kouma
            </label>
            <button type="submit" className="kk-btn-outline px-5 py-2 text-sm">
              Enregistrer
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
