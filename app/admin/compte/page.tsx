import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata = { title: "Mon compte — K-Kouma" };

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-lg">
      <ChangePasswordForm email={session.user.email ?? ""} />
    </div>
  );
}
