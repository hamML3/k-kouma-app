import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { minutesToTime, safeTimeZone } from "@/lib/availability";
import {
  addAvailabilityAction,
  addUnavailabilityAction,
  removeAvailabilityAction,
  removeUnavailabilityAction,
  updateTherapistTimezoneAction,
} from "@/lib/actions/availability";

export const metadata = { title: "Mes disponibilités — K-Kouma" };

// Lundi en tête, comme un agenda ; la valeur suit Date.getDay() (0 = dimanche).
const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const TIMEZONES = [
  { value: "Africa/Bamako", label: "Bamako (GMT+0)" },
  { value: "Africa/Abidjan", label: "Abidjan (GMT+0)" },
  { value: "Africa/Dakar", label: "Dakar (GMT+0)" },
  { value: "Africa/Ouagadougou", label: "Ouagadougou (GMT+0)" },
  { value: "Africa/Niamey", label: "Niamey (GMT+1)" },
  { value: "Europe/Paris", label: "Paris" },
];

const ERRORS: Record<string, string> = {
  range: "Plage invalide : elle doit durer au moins 45 minutes, le temps d'une séance.",
  overlap: "Cette plage chevauche une plage déjà saisie ce jour-là.",
  dates: "Dates invalides : la fin doit être le même jour ou après le début.",
  timezone: "Fuseau horaire inconnu.",
};

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const therapistId = Number(session.user.id);
  const { error } = await searchParams;

  const [profile, rules, unavailabilities] = await Promise.all([
    prisma.therapistProfile.findUnique({ where: { userId: therapistId }, select: { timezone: true } }),
    prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    }),
    prisma.therapistUnavailability.findMany({
      where: { therapistId, endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const timeZone = safeTimeZone(profile?.timezone);
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone, day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Mes disponibilités
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Vos patients réservent une séance de 45 minutes, une par heure, dans ces plages. Tant qu&apos;aucune plage
            n&apos;est saisie, ils peuvent proposer n&apos;importe quel horaire.
          </p>
        </div>

        {error && ERRORS[error] && <div className="kk-error">{ERRORS[error]}</div>}

        <section className="kk-card p-5">
          <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Semaine type
          </h2>

          {rules.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-1" aria-hidden>🗓️</p>
              <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
                Aucune plage pour l&apos;instant. Ajoutez la première ci-dessous.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-1">
              {WEEKDAYS.filter((d) => rules.some((r) => r.weekday === d.value)).map((d) => (
                <div key={d.value}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--kk-muted)" }}>
                    {d.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rules
                      .filter((r) => r.weekday === d.value)
                      .map((r) => (
                        <form key={r.id} action={removeAvailabilityAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            aria-label={`Retirer la plage ${d.label} ${minutesToTime(r.startMinute)} à ${minutesToTime(r.endMinute)}`}
                            className="px-3 py-1.5 rounded-full text-sm font-semibold"
                            style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
                          >
                            {minutesToTime(r.startMinute)} – {minutesToTime(r.endMinute)} ×
                          </button>
                        </form>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            action={addAvailabilityAction}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end mt-4 pt-4"
            style={{ borderTop: "1px solid var(--kk-border)" }}
          >
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="weekday" className="kk-label">Jour</label>
              <select id="weekday" name="weekday" className="kk-input" style={{ cursor: "pointer" }}>
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="start" className="kk-label">De</label>
              <input id="start" name="start" type="time" required defaultValue="09:00" className="kk-input" />
            </div>
            <div>
              <label htmlFor="end" className="kk-label">À</label>
              <input id="end" name="end" type="time" required defaultValue="12:00" className="kk-input" />
            </div>
            <button type="submit" className="kk-btn-green col-span-2 sm:col-span-1 text-sm">
              Ajouter
            </button>
          </form>
        </section>

        <section className="kk-card p-5">
          <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Absences
          </h2>
          <p className="text-xs mb-3" style={{ color: "var(--kk-muted)" }}>
            Congés, formation… Aucun créneau n&apos;est proposé sur ces jours.
          </p>

          {unavailabilities.length > 0 && (
            <div className="space-y-2 mb-4">
              {unavailabilities.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm" style={{ color: "var(--kk-dark)" }}>
                    {dateFormat.format(u.startsAt)} → {dateFormat.format(new Date(u.endsAt.getTime() - 1))}
                    {u.reason && <span style={{ color: "var(--kk-muted)" }}> · {u.reason}</span>}
                  </p>
                  <form action={removeUnavailabilityAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="text-xs font-bold" style={{ color: "var(--kk-mid)" }}>
                      Retirer
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addUnavailabilityAction} className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="from" className="kk-label">Du</label>
              <input id="from" name="from" type="date" required className="kk-input" />
            </div>
            <div>
              <label htmlFor="to" className="kk-label">Au (inclus)</label>
              <input id="to" name="to" type="date" required className="kk-input" />
            </div>
            <div className="col-span-2">
              <label htmlFor="reason" className="kk-label">Motif (facultatif, visible de vous seul)</label>
              <input id="reason" name="reason" type="text" maxLength={200} className="kk-input" />
            </div>
            <button type="submit" className="kk-btn-outline col-span-2 text-sm">
              Ajouter une absence
            </button>
          </form>
        </section>

        <section className="kk-card p-5">
          <form action={updateTherapistTimezoneAction} className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label htmlFor="timezone" className="kk-label">Mon fuseau horaire</label>
              <select id="timezone" name="timezone" defaultValue={timeZone} className="kk-input" style={{ cursor: "pointer" }}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="kk-btn-outline text-sm">
              Enregistrer
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
