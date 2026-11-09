export const SESSION_MINUTES = 60;
// Une séance d'une heure, puis 15 minutes de pause avant la suivante.
export const SLOT_STEP_MINUTES = 75;
export const BOOKING_HORIZON_DAYS = 14;
export const MIN_LEAD_MINUTES = 120;
export const DEFAULT_TIMEZONE = "Africa/Bamako";

export type WeeklyRule = { weekday: number; startMinute: number; endMinute: number };
export type TimeRange = { start: Date; end: Date };

export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instant UTC d'une heure murale ; le second calcul de décalage couvre les changements d'heure. */
export function zonedTimeToUtc(year: number, month: number, day: number, minuteOfDay: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  const first = wall - offsetMs(new Date(wall), timeZone);
  return new Date(wall - offsetMs(new Date(first), timeZone));
}

/** Jour de semaine (0 = dimanche) et minute de la journée d'un instant, dans un fuseau donné. */
export function wallClock(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
    minuteOfDay: p.hour * 60 + p.minute,
  };
}

function overlaps(start: Date, end: Date, ranges: TimeRange[]): boolean {
  return ranges.some((r) => start < r.end && end > r.start);
}

/** Créneaux libres, triés : règles hebdomadaires moins le passé proche et les périodes occupées. */
export function generateSlots(options: {
  rules: WeeklyRule[];
  timeZone: string;
  from: Date;
  busy: TimeRange[];
  days?: number;
}): Date[] {
  const { rules, timeZone, from, busy, days = BOOKING_HORIZON_DAYS } = options;
  const earliest = from.getTime() + MIN_LEAD_MINUTES * 60_000;
  const today = wallClock(from, timeZone);
  const slots = new Map<number, Date>();

  for (let offset = 0; offset <= days; offset++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const dayRules = rules.filter((r) => r.weekday === date.getUTCDay());

    for (const rule of dayRules) {
      for (
        let minute = rule.startMinute;
        minute + SESSION_MINUTES <= rule.endMinute;
        minute += SLOT_STEP_MINUTES
      ) {
        const start = zonedTimeToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), minute, timeZone);
        const end = new Date(start.getTime() + SESSION_MINUTES * 60_000);
        if (start.getTime() >= earliest && !overlaps(start, end, busy)) {
          slots.set(start.getTime(), start);
        }
      }
    }
  }

  return [...slots.values()].sort((a, b) => a.getTime() - b.getTime());
}

export type SlotOption = { iso: string; dayKey: string; dayLabel: string; timeLabel: string };

/** Libellés dans le fuseau du patient — calculés côté serveur pour éviter tout écart à l'hydratation. */
export function toSlotOptions(slots: Date[], timeZone: string): SlotOption[] {
  const dayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "short", day: "numeric", month: "short" });
  const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  return slots.map((slot) => {
    const { year, month, day } = wallClock(slot, timeZone);
    return {
      iso: slot.toISOString(),
      dayKey: `${year}-${month}-${day}`,
      dayLabel: dayFormat.format(slot),
      timeLabel: timeFormat.format(slot),
    };
  });
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
