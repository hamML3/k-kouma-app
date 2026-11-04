'use client'

import { SPECIALTIES, MAX_SPECIALTIES } from "@/lib/specialties";

/**
 * Sélection multiple de spécialités sous forme de pastilles (même style que
 * les « Langues de consultation »). Contrôlé par le parent ; la sélection est
 * envoyée via un champ caché joint par ", " — le serveur la revalide.
 *
 * `extraOptions` : anciennes valeurs déjà enregistrées qui ne figurent plus
 * dans la liste, affichées pour pouvoir être conservées ou retirées.
 */
export function SpecialtyPicker({
  name = "specialties",
  value,
  onChange,
  extraOptions = [],
}: {
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  extraOptions?: string[];
}) {
  const options = [...SPECIALTIES, ...extraOptions.filter((o) => !(SPECIALTIES as readonly string[]).includes(o))];
  const atMax = value.length >= MAX_SPECIALTIES;

  function toggle(s: string) {
    if (value.includes(s)) onChange(value.filter((v) => v !== s));
    else if (!atMax) onChange([...value, s]);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => {
          const active = value.includes(s);
          const disabled = !active && atMax;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => toggle(s)}
              className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all text-left"
              style={{
                background: active ? "var(--kk-green)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--kk-faint)" }}>
        {value.length}/{MAX_SPECIALTIES} sélectionnée{value.length > 1 ? "s" : ""}
        {atMax ? " — maximum atteint" : ""}
      </p>
      <input type="hidden" name={name} value={value.join(", ")} />
    </>
  );
}
