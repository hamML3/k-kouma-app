import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata = { title: "Mon compte — K-Kouma" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin" || session.user.role === "moderator") redirect("/admin/compte");

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      <main className="max-w-lg mx-auto px-5 py-8">
        <ChangePasswordForm email={session.user.email ?? ""} />
      </main>
    </div>
  );
}
