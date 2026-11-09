'use client'

import { useActionState, useMemo, useState } from "react";
import { sendCampaignAction, sendCampaignTestAction, type CampaignState } from "@/lib/actions/campaigns";

export type Candidate = { id: number; name: string; email: string; role: "patient" | "therapist"; verified: boolean; optedOut: boolean };

const initial: CampaignState = {};

/** Rédaction d'un e-mail groupé : contenu, catégorie, destinataires (groupes ou personnes), essai puis envoi. */
export function CampaignComposer({ candidates }: { candidates: Candidate[] }) {
  const [testState, testAction, testing] = useActionState(sendCampaignTestAction, initial);
  const [sendState, sendAction, sending] = useActionState(sendCampaignAction, initial);
  const [category, setCategory] = useState<"promotion" | "information">("promotion");
  // Champs contrôlés : React vide les champs non contrôlés après chaque action
  // de formulaire, ce qui effacerait le message après l'envoi d'un essai.
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [mode, setMode] = useState<"groups" | "people">("groups");
  const [roles, setRoles] = useState<Set<string>>(new Set(["patient"]));
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "patient" | "therapist">("all");

  // Même règle que le serveur (qui recalcule tout) : compte affiché avant l'envoi.
  const audience = useMemo(() => {
    const base =
      mode === "groups"
        ? candidates.filter((c) => roles.has(c.role) && (!verifiedOnly || c.verified))
        : candidates.filter((c) => picked.has(c.id));
    const optedOut = category === "promotion" ? base.filter((c) => c.optedOut).length : 0;
    return { count: base.length - optedOut, optedOut };
  }, [candidates, mode, roles, verifiedOnly, picked, category]);

  const visible = candidates.filter(
    (c) =>
      (roleFilter === "all" || c.role === roleFilter) &&
      (!search || `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <form className="space-y-6">
      <div className="kk-card p-6 space-y-4">
        <p className="font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          1. Le message
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["promotion", "Promotion ou actualité", "Offres, nouveautés, articles. Les personnes désinscrites ne la reçoivent pas ; un lien de désinscription est ajouté."],
              ["information", "Information de service", "Tarifs, maintenance, conditions d'utilisation. Envoyée à tous les destinataires choisis, sans lien de désinscription."],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className="rounded-xl p-3 cursor-pointer text-sm"
              style={{ border: category === value ? "2px solid var(--kk-purple)" : "1.5px solid var(--kk-border)", background: "#fff" }}
            >
              <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} className="mr-2" />
              <strong style={{ color: "var(--kk-dark)" }}>{label}</strong>
              <span className="block text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
                {hint}
              </span>
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="subject" className="kk-label">Objet</label>
          <input id="subject" name="subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} className="kk-input" placeholder="Ex. Nouveau : le coaching de vie arrive sur K-Kouma" />
        </div>
        <div>
          <label htmlFor="body" className="kk-label">Message</label>
          <textarea
            id="body"
            name="body"
            required
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="kk-input resize-y"
            placeholder={"Écrivez votre message. Laissez une ligne vide entre les paragraphes.\n« Bonjour <prénom>, » est ajouté automatiquement."}
          />
          <p className="text-xs mt-1" style={{ color: "var(--kk-faint)" }}>
            Évitez toute information de santé : un e-mail peut être lu par un proche.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="buttonLabel" className="kk-label">Bouton (facultatif) : texte</label>
            <input id="buttonLabel" name="buttonLabel" maxLength={60} value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} className="kk-input" placeholder="Ex. Découvrir" />
          </div>
          <div>
            <label htmlFor="buttonUrl" className="kk-label">Bouton : lien</label>
            <input id="buttonUrl" name="buttonUrl" type="url" maxLength={500} value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} className="kk-input" placeholder="https://k-kouma.com/…" />
          </div>
        </div>
      </div>

      <div className="kk-card p-6 space-y-4">
        <p className="font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          2. Les destinataires
        </p>
        <input type="hidden" name="audienceMode" value={mode} />
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["groups", "Par groupe"],
              ["people", "Choisir des personnes"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className="text-sm font-bold px-4 py-2 rounded-full"
              style={mode === value ? { background: "var(--kk-purple)", color: "#fff" } : { background: "#fff", color: "var(--kk-mid)", border: "1.5px solid var(--kk-border-mid)" }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "groups" ? (
          <div className="space-y-2 text-sm" style={{ color: "var(--kk-mid)" }}>
            {(
              [
                ["patient", "Patients"],
                ["therapist", "Psychologues et coachs"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 font-semibold">
                <input type="checkbox" name="roles" value={value} checked={roles.has(value)} onChange={() => setRoles(toggle(roles, value))} />
                {label} ({candidates.filter((c) => c.role === value).length})
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="verifiedOnly" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              Uniquement les adresses e-mail vérifiées (recommandé : moins de rebonds)
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="hidden" name="userIds" value={[...picked].join(",")} />
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un nom ou un e-mail…"
                className="kk-input max-w-xs text-sm"
                aria-label="Rechercher une personne"
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className="kk-input max-w-[12rem] text-sm" aria-label="Filtrer par rôle">
                <option value="all">Tout le monde</option>
                <option value="patient">Patients</option>
                <option value="therapist">Praticiens</option>
              </select>
              <button type="button" className="text-xs font-bold underline" onClick={() => setPicked(new Set([...picked, ...visible.map((c) => c.id)]))}>
                Tout cocher ({visible.length})
              </button>
              <button type="button" className="text-xs font-bold underline" onClick={() => setPicked(new Set())}>
                Tout décocher
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl" style={{ border: "1px solid var(--kk-border)" }}>
              {visible.slice(0, 500).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer" style={{ borderBottom: "1px solid var(--kk-border)" }}>
                  <input type="checkbox" checked={picked.has(c.id)} onChange={() => setPicked(toggle(picked, c.id))} />
                  <span className="min-w-0 flex-1">
                    <strong style={{ color: "var(--kk-dark)" }}>{c.name}</strong>{" "}
                    <span className="text-xs" style={{ color: "var(--kk-muted)" }}>
                      {c.email} · {c.role === "patient" ? "Patient" : "Praticien"}
                      {!c.verified && " · e-mail non vérifié"}
                      {c.optedOut && " · désinscrit des promotions"}
                    </span>
                  </span>
                </label>
              ))}
              {visible.length === 0 && (
                <p className="text-sm p-4 text-center" style={{ color: "var(--kk-muted)" }}>
                  Personne ne correspond à cette recherche.
                </p>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--kk-muted)" }}>
              {picked.size} personne{picked.size > 1 ? "s" : ""} cochée{picked.size > 1 ? "s" : ""}
            </p>
          </div>
        )}

        <p className="text-sm font-semibold rounded-xl px-3 py-2" style={{ background: "var(--kk-bg)", color: "var(--kk-dark)" }}>
          {audience.count} destinataire{audience.count > 1 ? "s" : ""}
          {audience.optedOut > 0 && ` (${audience.optedOut} désinscrit${audience.optedOut > 1 ? "s" : ""} des promotions, écarté${audience.optedOut > 1 ? "s" : ""})`}
        </p>
      </div>

      <div className="kk-card p-6 space-y-3">
        <p className="font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          3. Vérifier puis envoyer
        </p>
        {testState.error && <div className="kk-error">{testState.error}</div>}
        {testState.message && (
          <p className="text-sm font-semibold" style={{ color: "var(--kk-green-text)" }}>
            {testState.message}
          </p>
        )}
        {sendState.error && <div className="kk-error">{sendState.error}</div>}
        {sendState.message && (
          <div className="rounded-xl p-3 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}>
            {sendState.message}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <button type="submit" formAction={testAction} disabled={testing} className="kk-btn-outline px-5 py-2.5 text-sm">
            {testing ? "Envoi…" : "M'envoyer un essai"}
          </button>
          <button
            type="submit"
            formAction={sendAction}
            disabled={sending || audience.count === 0}
            onClick={(e) => {
              if (!window.confirm(`Envoyer ce message à ${audience.count} personne${audience.count > 1 ? "s" : ""} ? L'envoi ne peut pas être annulé.`)) {
                e.preventDefault();
              }
            }}
            className="kk-btn-purple px-5 py-2.5 text-sm"
          >
            {sending ? "Envoi en cours…" : `Envoyer à ${audience.count} personne${audience.count > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </form>
  );
}
