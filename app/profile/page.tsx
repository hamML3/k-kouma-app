import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./_client";
import { AppHeader } from "@/components/AppHeader";

export const metadata = { title: "Mon profil — K-Kouma" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const userId = Number(session.user.id);

  const [profile, settings] = await Promise.all([
    prisma.therapistProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName:  true,
        bio:       true,
        languages: true,
        specialties: true,
        commissionPercent: true,
      },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!profile) redirect("/dashboard");

  const commissionPercent =
    profile.commissionPercent != null
      ? Number(profile.commissionPercent)
      : Number(settings?.defaultCommissionPercent ?? 20);

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />
      <ProfileClient
        userId={userId}
        profile={{
          firstName:  profile.firstName,
          lastName:   profile.lastName,
          bio:        profile.bio        ?? "",
          languages:  profile.languages  ?? "",
          specialties: profile.specialties ?? "",
        }}
        commissionPercent={commissionPercent}
      />
    </div>
  );
}
