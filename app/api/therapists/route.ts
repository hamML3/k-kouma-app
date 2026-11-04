import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET : liste publique des thérapeutes vérifiés (avec filtres)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language");
  const specialty = searchParams.get("specialty");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(20, Number(searchParams.get("limit") ?? "10"));
  const skip = (page - 1) * limit;

  const therapists = await prisma.therapistProfile.findMany({
    where: {
      isVerified: true,
      user: { status: "active" },
      ...(language ? { languages: { contains: language } } : {}),
      ...(specialty ? { specialties: { contains: specialty } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialties: true,
      bio: true,
      profilePictureUrl: true,
      languages: true,
    },
    skip,
    take: limit,
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json({ therapists, page, limit });
}
