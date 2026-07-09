import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  onboardingAnswers: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: Number(session.user.id) },
  });

  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { onboardingAnswers, ...rest } = parsed.data;

  const profile = await prisma.patientProfile.update({
    where: { userId: Number(session.user.id) },
    data: {
      ...rest,
      ...(onboardingAnswers !== undefined
        ? { onboardingAnswers: onboardingAnswers as Prisma.InputJsonValue }
        : {}),
    },
  });

  return NextResponse.json({ profile });
}
