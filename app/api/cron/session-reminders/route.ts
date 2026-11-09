import { isAuthorizedCron } from "@/lib/cronAuth";
import { runAppointmentReminders } from "@/lib/appointmentReminders";

/**
 * Notifications de rendez-vous liées au temps, à appeler toutes les 15 minutes
 * (voir docs/exploitation.md) : rappel la veille, rappel dans l'heure qui
 * précède, relance d'une demande en attente, et clôture (avec recrédit) d'une
 * demande jamais confirmée dont l'heure est passée.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  return Response.json(await runAppointmentReminders());
}
