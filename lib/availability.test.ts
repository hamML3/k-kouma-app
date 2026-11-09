import { describe, it, expect } from "vitest";
import {
  generateSlots,
  minutesToTime,
  safeTimeZone,
  timeToMinutes,
  toSlotOptions,
  wallClock,
  zonedTimeToUtc,
} from "./availability";

const MONDAY_9_TO_12 = [{ weekday: 1, startMinute: 540, endMinute: 720 }];
// Dimanche 1er novembre 2026, 12:00 UTC.
const SUNDAY_NOON = new Date("2026-11-01T12:00:00.000Z");

describe("zonedTimeToUtc", () => {
  it("treats Bamako as UTC", () => {
    expect(zonedTimeToUtc(2026, 11, 2, 540, "Africa/Bamako").toISOString()).toBe("2026-11-02T09:00:00.000Z");
  });

  it("applies the Paris winter and summer offsets", () => {
    expect(zonedTimeToUtc(2026, 1, 15, 540, "Europe/Paris").toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(zonedTimeToUtc(2026, 7, 15, 540, "Europe/Paris").toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("is correct on the day of a clock change", () => {
    // Paris passe à l'heure d'été le 29 mars 2026 à 2 h.
    expect(zonedTimeToUtc(2026, 3, 29, 60, "Europe/Paris").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(zonedTimeToUtc(2026, 3, 29, 180, "Europe/Paris").toISOString()).toBe("2026-03-29T01:00:00.000Z");
  });
});

describe("wallClock", () => {
  it("gives the local weekday, which can differ from the UTC one", () => {
    const sundayNightUtc = new Date("2026-11-01T23:30:00.000Z");
    expect(wallClock(sundayNightUtc, "Africa/Bamako").weekday).toBe(0);
    expect(wallClock(sundayNightUtc, "Europe/Paris").weekday).toBe(1);
    expect(wallClock(sundayNightUtc, "Europe/Paris").minuteOfDay).toBe(30);
  });
});

describe("generateSlots", () => {
  const options = { rules: MONDAY_9_TO_12, timeZone: "Africa/Bamako", from: SUNDAY_NOON, busy: [] };

  it("offers one-hour sessions with a 15-minute break between them", () => {
    const slots = generateSlots({ ...options, days: 1 });
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-11-02T09:00:00.000Z",
      "2026-11-02T10:15:00.000Z",
    ]);
  });

  it("drops a slot whose session would overrun the range", () => {
    const rules = [{ weekday: 1, startMinute: 540, endMinute: 620 }];
    expect(generateSlots({ ...options, rules, days: 1 })).toHaveLength(1);
  });

  it("repeats every week up to the horizon", () => {
    expect(generateSlots({ ...options, days: 14 })).toHaveLength(4);
  });

  it("removes slots overlapping a busy period, even with a different start", () => {
    const busy = [{ start: new Date("2026-11-02T10:30:00.000Z"), end: new Date("2026-11-02T11:15:00.000Z") }];
    const slots = generateSlots({ ...options, busy, days: 1 });
    expect(slots.map((s) => s.getUTCHours())).toEqual([9]);
  });

  it("refuses slots in the past or too soon", () => {
    const from = new Date("2026-11-02T07:30:00.000Z");
    const slots = generateSlots({ ...options, from, days: 0 });
    expect(slots.map((s) => s.toISOString())).toEqual(["2026-11-02T10:15:00.000Z"]);
  });

  it("deduplicates overlapping rules", () => {
    const rules = [...MONDAY_9_TO_12, ...MONDAY_9_TO_12];
    expect(generateSlots({ ...options, rules, days: 1 })).toHaveLength(2);
  });

  it("uses the therapist's timezone", () => {
    const slots = generateSlots({ ...options, timeZone: "Europe/Paris", days: 1 });
    expect(slots[0].toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });
});

describe("toSlotOptions", () => {
  it("labels a slot in the patient's timezone", () => {
    const slot = new Date("2026-11-02T09:00:00.000Z");
    expect(toSlotOptions([slot], "Africa/Bamako")[0].timeLabel).toBe("09:00");
    expect(toSlotOptions([slot], "Europe/Paris")[0].timeLabel).toBe("10:00");
  });

  it("groups by the patient's local day", () => {
    const slot = new Date("2026-11-01T23:30:00.000Z");
    expect(toSlotOptions([slot], "Africa/Bamako")[0].dayKey).toBe("2026-11-1");
    expect(toSlotOptions([slot], "Europe/Paris")[0].dayKey).toBe("2026-11-2");
  });
});

describe("helpers", () => {
  it("falls back on an unknown timezone", () => {
    expect(safeTimeZone("Mars/Olympus")).toBe("Africa/Bamako");
    expect(safeTimeZone("Europe/Paris")).toBe("Europe/Paris");
  });

  it("converts times both ways", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(timeToMinutes("25:00")).toBeNull();
  });
});
