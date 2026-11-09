import { prisma } from "@/lib/prisma";
import { formatDateTime, sendAppointmentNoticeEmail, sendSessionReminderEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { releaseFundingPayment } from "@/lib/credits";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type Party = { id: number; email: string; name: string };
type Row = {
  id: number;
  scheduledAt: Date;
  proposedBy: string;
  patientId: number;
  therapistId: number;
  patient: { email: string; patientProfile: { nickname: string } | null };
  therapist: { email: string; therapistProfile: { firstName: string; lastName: string } | null };
};

const SELECT = {
  id: true,
  scheduledAt: true,
  proposedBy: true,
  patientId: true,
  therapistId: true,
  patient: { select: { email: true, patientProfile: { select: { nickname: true } } } },
  therapist: { select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
} as const;

function parties(a: Row): { patient: Party; therapist: Party; therapistFullName: string } {
  const p = a.therapist.therapistProfile;
  return {
    patient: { id: a.patientId, email: a.patient.email, name: a.patient.patientProfile?.nickname ?? "Votre patient" },
    therapist: { id: a.therapistId, email: a.therapist.email, name: p?.firstName ?? "" },
    therapistFullName: p ? `${p.firstName} ${p.lastName}` : "Votre praticien",
  };
}

async function safeEmail(label: string, send: () => Promise<unknown>, failures: { count: number }) {
  try {
    await send();
  } catch (err) {
    failures.count += 1;
    console.error(`[notify:${label}] envoi échoué:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Notifications de rendez-vous déclenchées par le temps (cron, voir
 * app/api/cron/session-reminders). Chaque envoi est « réservé » en base avant
 * de partir (updateMany conditionnel) : deux exécutions qui se chevauchent
 * n'envoient jamais deux fois le même rappel.
 */
export async function runAppointmentReminders(now = new Date()) {
  const failures = { count: 0 };
  const result = { dayBefore: 0, startingSoon: 0, pendingNudged: 0, expired: 0 };

  // 1. Veille : séance confirmée dans 20 à 24 h.
  const dayBefore = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      scheduledAt: { gte: new Date(now.getTime() + 20 * HOUR), lte: new Date(now.getTime() + 24 * HOUR) },
    },
    select: SELECT,
  });
  for (const a of dayBefore) {
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count === 0) continue;
    const { patient, therapist, therapistFullName } = parties(a);
    const when = formatDateTime(a.scheduledAt);
    for (const [who, other] of [[patient, therapistFullName], [therapist, patient.name]] as const) {
      await createNotification({ userId: who.id, type: "appointment.reminder", title: "Séance demain", body: `Avec ${other}, le ${when}.`, link: "/appointments" });
      await safeEmail("appointment.reminder", () => sendSessionReminderEmail(who.email, who.name, other, a.scheduledAt), failures);
    }
    result.dayBefore += 1;
  }

  // 2. Juste avant : séance confirmée qui commence dans l'heure (+15 min de marge pour un cron horaire).
  const soon = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      startReminderSentAt: null,
      scheduledAt: { gt: now, lte: new Date(now.getTime() + 75 * MINUTE) },
    },
    select: SELECT,
  });
  for (const a of soon) {
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, startReminderSentAt: null }, data: { startReminderSentAt: now } });
    if (claimed.count === 0) continue;
    const { patient, therapist, therapistFullName } = parties(a);
    const time = a.scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });
    for (const [who, other] of [[patient, therapistFullName], [therapist, patient.name]] as const) {
      await createNotification({
        userId: who.id,
        type: "appointment.starting",
        title: `Votre séance commence à ${time}`,
        body: `Avec ${other}. La salle ouvre 15 minutes avant.`,
        link: "/appointments",
      });
      await safeEmail(
        "appointment.starting",
        () =>
          sendAppointmentNoticeEmail({
            to: who.email,
            name: who.name || "Bonjour",
            subject: `Votre séance commence à ${time}`,
            title: "Votre séance commence bientôt",
            lines: [
              `Votre séance avec ${other} commence à ${time} (heure de Bamako).`,
              "La salle ouvre 15 minutes avant : vérifiez votre connexion, votre micro et votre caméra. La séance dure une heure.",
            ],
            linkLabel: "Rejoindre la séance",
          }),
        failures
      );
    }
    result.startingSoon += 1;
  }

  // 3. Demande en attente qui approche : on relance la personne qui doit répondre.
  const pending = await prisma.appointment.findMany({
    where: {
      status: "pending",
      reminderSentAt: null,
      scheduledAt: { gte: new Date(now.getTime() + 2 * HOUR), lte: new Date(now.getTime() + 24 * HOUR) },
    },
    select: SELECT,
  });
  for (const a of pending) {
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count === 0) continue;
    const { patient, therapist, therapistFullName } = parties(a);
    const awaiting = a.proposedBy === "patient" ? therapist : patient;
    const other = a.proposedBy === "patient" ? patient.name : therapistFullName;
    const when = formatDateTime(a.scheduledAt);
    await createNotification({
      userId: awaiting.id,
      type: "appointment.pending_reminder",
      title: "Une séance attend votre réponse",
      body: `Avec ${other}, le ${when}. Confirmez ou proposez une autre date.`,
      link: "/appointments",
    });
    await safeEmail(
      "appointment.pending_reminder",
      () =>
        sendAppointmentNoticeEmail({
          to: awaiting.email,
          name: awaiting.name || "Bonjour",
          subject: "Une séance attend votre réponse",
          title: "Une séance attend votre réponse",
          lines: [`La séance avec ${other} prévue le ${when} n'est pas encore confirmée.`, "Confirmez-la ou proposez une autre date."],
          linkLabel: "Répondre",
        }),
      failures
    );
    result.pendingNudged += 1;
  }

  // 4. Demande jamais confirmée dont l'heure est passée : close, séance recréditée au patient.
  const stale = await prisma.appointment.findMany({
    where: { status: "pending", scheduledAt: { lt: now } },
    select: { ...SELECT, fundedByPaymentId: true },
  });
  for (const a of stale) {
    const expired = await prisma.$transaction(async (tx) => {
      const canceled = await tx.appointment.updateMany({ where: { id: a.id, status: "pending" }, data: { status: "canceled" } });
      if (canceled.count === 0) return false;
      await tx.patientProfile.updateMany({ where: { userId: a.patientId }, data: { sessionCredits: { increment: 1 } } });
      await releaseFundingPayment(tx, a.fundedByPaymentId);
      return true;
    });
    if (!expired) continue;
    const { patient, therapist, therapistFullName } = parties(a);
    const when = formatDateTime(a.scheduledAt);
    await createNotification({
      userId: patient.id,
      type: "appointment.expired",
      title: "Demande de séance expirée",
      body: `La séance du ${when} n'a pas été confirmée à temps. Votre séance vous a été recréditée.`,
      link: "/appointments",
    });
    await createNotification({
      userId: therapist.id,
      type: "appointment.expired",
      title: "Demande de séance expirée",
      body: `La demande de ${patient.name} pour le ${when} n'a pas été confirmée à temps.`,
      link: "/appointments",
    });
    await safeEmail(
      "appointment.expired",
      () =>
        sendAppointmentNoticeEmail({
          to: patient.email,
          name: patient.name,
          subject: "Demande de séance expirée",
          title: "Demande de séance expirée",
          lines: [
            `Votre séance avec ${therapistFullName} prévue le ${when} n'a pas été confirmée à temps.`,
            "La séance vous a été recréditée : vous pouvez réserver un autre créneau.",
          ],
          linkLabel: "Réserver un autre créneau",
        }),
      failures
    );
    result.expired += 1;
  }

  return { ...result, emailFailures: failures.count };
}
