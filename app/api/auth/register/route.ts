import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerPatientSchema, registerTherapistSchema } from "@/lib/validators/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role = "patient" } = body;

    if (role === "therapist") {
      const parsed = registerTherapistSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const { email, password, phoneNumber, firstName, lastName, specialties, bio, hourlyRate, languages } = parsed.data;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          phoneNumber,
          passwordHash,
          role: "therapist",
          therapistProfile: {
            create: { firstName, lastName, specialties, bio, hourlyRate, languages },
          },
        },
        select: { id: true, email: true, role: true, createdAt: true },
      });

      return NextResponse.json({ user }, { status: 201 });
    }

    // Patient (défaut)
    const parsed = registerPatientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, phoneNumber, nickname, timezone } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        phoneNumber,
        passwordHash,
        role: "patient",
        patientProfile: {
          create: { nickname, timezone },
        },
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
