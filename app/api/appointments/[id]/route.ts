import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateAppointmentSchema } from "@/lib/validators/appointment";

// PATCH : modifier le statut d'un rendez-vous
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const appointmentId = Number(id);
  if (isNaN(appointmentId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const userId = Number(session.user.id);

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });

  // Seuls le patient concerné, le thérapeute concerné ou un admin peuvent modifier
  const isOwner = appointment.patientId === userId || appointment.therapistId === userId;
  if (!isOwner && session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
    },
  });

  return NextResponse.json({ appointment: updated });
}

// DELETE : annuler un rendez-vous
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const appointmentId = Number(id);
  if (isNaN(appointmentId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const userId = Number(session.user.id);

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });

  const isOwner = appointment.patientId === userId || appointment.therapistId === userId;
  if (!isOwner && session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "canceled" },
  });

  return NextResponse.json({ message: "Rendez-vous annulé" });
}
