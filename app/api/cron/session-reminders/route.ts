import { prisma } from "@/lib/prisma";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { formatDateTime, sendSessionReminderEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Rappel à J-1, à appeler toutes les heures (voir docs/exploitation.md). La
 * fenêtre de 20 à 24 h laisse plusieurs passages pour rattraper une exécution
 * manquée. reminderSentAt est posé avant l'envoi : mieux vaut un rappel perdu
 * sur une panne qu'un doublon si deux exécutions se chevauchent.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      scheduledAt: {
        gte: new Date(now.getTime() + 20 * HOUR_MS),
        lte: new Date(now.getTime() + 24 * HOUR_MS),
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      patientId: true,
      therapistId: true,
      patient: { select: { email: true, patientProfile: { select: { nickname: true } } } },
      therapist: { select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  let reminded = 0;
  let emailFailures = 0;

  for (const appointment of due) {
    const claimed = await prisma.appointment.updateMany({
      where: { id: appointment.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    const patientName = appointment.patient.patientProfile?.nickname ?? "Votre patient";
    const profile = appointment.therapist.therapistProfile;
    const therapistName = profile ? `${profile.firstName} ${profile.lastName}` : "Votre psychologue";
    const when = formatDateTime(appointment.scheduledAt);

    const recipients = [
      { userId: appointment.patientId, email: appointment.patient.email, name: patientName, other: therapistName },
      { userId: appointment.therapistId, email: appointment.therapist.email, name: profile?.firstName ?? "", other: patientName },
    ];

    for (const recipient of recipients) {
      await createNotification({
        userId: recipient.userId,
        type: "appointment.reminder",
        title: "Séance demain",
        body: `Avec ${recipient.other}, le ${when}.`,
        link: "/appointments",
      });
      try {
        await sendSessionReminderEmail(recipient.email, recipient.name, recipient.other, appointment.scheduledAt);
      } catch (err) {
        emailFailures += 1;
        console.error("[notify:appointment.reminder] envoi échoué:", err);
      }
    }
    reminded += 1;
  }

  return Response.json({ reminded, emailFailures });
}
