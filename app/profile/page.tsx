import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./_client";

export const metadata = { title: "Mon profil — K-Kouman" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const userId = Number(session.user.id);

  const profile = await prisma.therapistProfile.findUnique({
    where: { userId },
    select: {
      firstName: true,
      lastName:  true,
      bio:       true,
      languages: true,
      specialties: true,
      hourlyRate:  true,
    },
  });

  if (!profile) redirect("/dashboard");

  return (
    <ProfileClient
      userId={userId}
      profile={{
        firstName:  profile.firstName,
        lastName:   profile.lastName,
        bio:        profile.bio        ?? "",
        languages:  profile.languages  ?? "",
        specialties: profile.specialties ?? "",
        hourlyRate:  Number(profile.hourlyRate),
      }}
    />
  );
}
