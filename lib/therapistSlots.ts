import { prisma } from "@/lib/prisma";
import { BOOKING_HORIZON_DAYS, SESSION_MINUTES, generateSlots, safeTimeZone } from "@/lib/availability";

/**
 * `configured` est faux tant que le thérapeute n'a saisi aucune disponibilité :
 * la réservation reste alors libre, pour ne pas bloquer ses patients.
 */
export async function getBookableSlots(therapistId: number): Promise<{ configured: boolean; slots: Date[] }> {
  const from = new Date();
  const horizon = new Date(from.getTime() + (BOOKING_HORIZON_DAYS + 1) * 86_400_000);

  const [profile, rules, unavailabilities, appointments] = await Promise.all([
    prisma.therapistProfile.findUnique({ where: { userId: therapistId }, select: { timezone: true } }),
    prisma.therapistAvailability.findMany({
      where: { therapistId },
      select: { weekday: true, startMinute: true, endMinute: true },
    }),
    prisma.therapistUnavailability.findMany({
      where: { therapistId, endsAt: { gt: from }, startsAt: { lt: horizon } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        therapistId,
        status: { in: ["pending", "confirmed"] },
        scheduledAt: { gt: new Date(from.getTime() - 86_400_000), lt: horizon },
      },
      select: { scheduledAt: true, durationMinutes: true },
    }),
  ]);

  if (rules.length === 0) return { configured: false, slots: [] };

  const busy = [
    ...unavailabilities.map((u) => ({ start: u.startsAt, end: u.endsAt })),
    ...appointments.map((a) => ({
      start: a.scheduledAt,
      end: new Date(a.scheduledAt.getTime() + (a.durationMinutes || SESSION_MINUTES) * 60_000),
    })),
  ];

  return {
    configured: true,
    slots: generateSlots({ rules, timeZone: safeTimeZone(profile?.timezone), from, busy }),
  };
}

export async function isSlotBookable(therapistId: number, startsAt: Date): Promise<boolean> {
  const { configured, slots } = await getBookableSlots(therapistId);
  return !configured || slots.some((slot) => slot.getTime() === startsAt.getTime());
}
