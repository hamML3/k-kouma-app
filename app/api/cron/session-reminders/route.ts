import { isAuthorizedCron } from "@/lib/cronAuth";
import { runAppointmentReminders } from "@/lib/appointmentReminders";
import { runOrangeMoneySweep } from "@/lib/orangeMoneyPayments";
import { isOrangeWebpayConfigured } from "@/lib/orangeMoneyWebpay";

/**
 * Notifications de rendez-vous liées au temps, à appeler toutes les 15 minutes
 * (voir docs/exploitation.md) : rappel la veille, rappel dans l'heure qui
 * précède, relance d'une demande en attente, et clôture (avec recrédit) d'une
 * demande jamais confirmée dont l'heure est passée. Relève aussi les
 * paiements Orange Money restés en attente (notification d'Orange perdue).
 */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  const reminders = await runAppointmentReminders();
  // Un incident chez Orange ne doit pas empêcher les rappels de rendez-vous.
  const orangeMoney = isOrangeWebpayConfigured() ? await runOrangeMoneySweep().catch(() => ({ error: true })) : null;
  return Response.json({ ...reminders, orangeMoney });
}
