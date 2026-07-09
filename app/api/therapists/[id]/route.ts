import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET : profil public d'un thérapeute
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const therapistId = Number(id);
  if (isNaN(therapistId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const therapist = await prisma.therapistProfile.findFirst({
    where: { userId: therapistId, isVerified: true, user: { status: "active" } },
    select: {
      firstName: true,
      lastName: true,
      specialties: true,
      bio: true,
      profilePictureUrl: true,
      hourlyRate: true,
      languages: true,
    },
  });

  if (!therapist) return NextResponse.json({ error: "Thérapeute introuvable" }, { status: 404 });

  return NextResponse.json({ therapist });
}

const updateTherapistSchema = z.object({
  specialties: z.string().optional(),
  bio: z.string().max(2000).optional(),
  hourlyRate: z.number().min(0).optional(),
  languages: z.string().optional(),
  profilePictureUrl: z.string().url().optional(),
});

// PATCH : mise à jour du profil par le thérapeute lui-même
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateTherapistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.therapistProfile.update({
    where: { userId: Number(id) },
    data: parsed.data,
  });

  return NextResponse.json({ profile });
}
