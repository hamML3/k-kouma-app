'use client'

import { useState } from "react";
import type { SlotOption } from "@/lib/availability";

/** Choix d'un jour puis d'une heure ; `scheduledAt` part en UTC, sans ambiguïté de fuseau. */
export function SlotPicker({ slots, onChange }: { slots: SlotOption[]; onChange: (selected: boolean) => void }) {
  const days = [...new Map(slots.map((s) => [s.dayKey, s.dayLabel])).entries()];
  const [dayKey, setDayKey] = useState(days[0]?.[0]);
  const [iso, setIso] = useState("");

  function pick(value: string) {
    setIso(value);
    onChange(Boolean(value));
  }

  return (
    <div>
      <p className="kk-label">Jour</p>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
        {days.map(([key, label]) => {
          const active = key === dayKey;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setDayKey(key);
                pick("");
              }}
              className="px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all"
              style={{
                background: active ? "var(--kk-green)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="kk-label">Heure</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots
          .filter((s) => s.dayKey === dayKey)
          .map((s) => {
            const active = s.iso === iso;
            return (
              <button
                key={s.iso}
                type="button"
                aria-pressed={active}
                onClick={() => pick(s.iso)}
                className="py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: active ? "var(--kk-purple)" : "#fff",
                  color: active ? "#fff" : "var(--kk-mid)",
                  border: active ? "none" : "1.5px solid var(--kk-border-mid)",
                }}
              >
                {s.timeLabel}
              </button>
            );
          })}
      </div>

      <input type="hidden" name="scheduledAt" value={iso} />
    </div>
  );
}
