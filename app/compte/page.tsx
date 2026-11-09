import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/ChangeEmailForm";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Mon compte — K-Kouma" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin" || session.user.role === "moderator") redirect("/admin/compte");
  // L'adresse vient de la base : celle de la session peut dater d'avant un changement.
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { email: true, pendingEmail: true },
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      <main className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <ChangePasswordForm email={user?.email ?? session.user.email ?? ""} />
        <ChangeEmailForm currentEmail={user?.email ?? session.user.email ?? ""} pendingEmail={user?.pendingEmail ?? null} />
      </main>
    </div>
  );
}
