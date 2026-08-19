'use client'

import { useState, useTransition } from "react";
import { saveOnboardingAnswers, type OnboardingAnswers } from "@/lib/actions/onboarding";

type StepType = "single" | "multi" | "scale" | "safety";

interface Option {
  value: string;
  label: string;
  desc?: string;
  emergency?: boolean;
  accent?: "green" | "purple" | "gold";
}

interface Step {
  id: keyof OnboardingAnswers;
  title: string;
  subtitle?: string;
  type: StepType;
  options: Option[];
  required: boolean;
}

const STEPS: Step[] = [
  {
    id: "therapyType",
    title: "Quel accompagnement recherchez-vous ?",
    subtitle: "Choisissez le type de thérapie qui vous correspond.",
    type: "single",
    required: true,
    options: [
      { value: "individuelle", label: "Thérapie individuelle", desc: "Un accompagnement personnel et confidentiel.", accent: "green" },
      { value: "couple", label: "Thérapie de couple", desc: "Renforcez votre relation à deux.", accent: "purple" },
      { value: "enfant", label: "Adolescent / Enfant", desc: "Un soutien adapté aux plus jeunes.", accent: "gold" },
    ],
  },
  {
    id: "motifs",
    title: "Qu'est-ce qui vous amène aujourd'hui ?",
    subtitle: "Plusieurs choix possibles. Cela reste strictement confidentiel.",
    type: "multi",
    required: true,
    options: [
      { value: "anxiete", label: "Anxiété / stress" },
      { value: "humeur", label: "Humeur / tristesse" },
      { value: "relations", label: "Relations" },
      { value: "sommeil", label: "Sommeil" },
      { value: "confiance", label: "Confiance en soi" },
      { value: "traumatisme", label: "Traumatisme" },
      { value: "deuil", label: "Deuil / perte" },
      { value: "autre", label: "Autre" },
    ],
  },
  {
    id: "mood",
    title: "Comment vous sentez-vous en ce moment ?",
    subtitle: "Soyez honnête, il n'y a pas de mauvaise réponse.",
    type: "scale",
    required: true,
    options: [
      { value: "1", label: "Très mal" },
      { value: "2", label: "Pas bien" },
      { value: "3", label: "Moyen" },
      { value: "4", label: "Bien" },
      { value: "5", label: "Très bien" },
    ],
  },
  {
    id: "duration",
    title: "Depuis combien de temps ressentez-vous cela ?",
    type: "single",
    required: true,
    options: [
      { value: "moins1mois", label: "Moins d'un mois" },
      { value: "1a3mois", label: "1 à 3 mois" },
      { value: "3a12mois", label: "3 à 12 mois" },
      { value: "plus1an", label: "Plus d'un an" },
    ],
  },
  {
    id: "previousTherapy",
    title: "Avez-vous déjà consulté un psychologue ?",
    type: "single",
    required: true,
    options: [
      { value: "jamais", label: "Non, c'est ma première fois" },
      { value: "passe", label: "Oui, dans le passé" },
      { value: "actuel", label: "Oui, j'en vois un actuellement" },
    ],
  },
  {
    id: "safety",
    title: "Avez-vous des pensées de vous faire du mal ou de mettre fin à vos jours ?",
    subtitle: "Cette information est confidentielle et nous aide à mieux vous orienter.",
    type: "safety",
    required: true,
    options: [
      { value: "non", label: "Non" },
      { value: "parfois", label: "Parfois, mais pas en ce moment" },
      { value: "oui", label: "Oui, en ce moment", emergency: true },
    ],
  },
  {
    id: "langue",
    title: "Dans quelle langue souhaitez-vous consulter ?",
    subtitle: "Nous trouverons un psychologue qui parle votre langue.",
    type: "single",
    required: true,
    options: [
      { value: "francais", label: "Français" },
      { value: "bambara", label: "Bambara" },
      { value: "peulh", label: "Peulh" },
      { value: "malinke", label: "Malinké" },
      { value: "sorai", label: "Soraï" },
      { value: "peuimporte", label: "Peu importe" },
    ],
  },
  {
    id: "mode",
    title: "Comment souhaitez-vous consulter ?",
    subtitle: "Même tarif, même durée, même qualité.",
    type: "single",
    required: true,
    options: [
      { value: "chat", label: "Chat", desc: "Échangez par messages écrits." },
      { value: "audio", label: "Audio", desc: "Consultez par appel vocal uniquement." },
      { value: "video", label: "Vidéo", desc: "L'expérience la plus proche du cabinet." },
    ],
  },
  {
    id: "therapistGender",
    title: "Préférence pour le genre de votre psychologue ?",
    type: "single",
    required: false,
    options: [
      { value: "peuimporte", label: "Peu importe" },
      { value: "femme", label: "Femme" },
      { value: "homme", label: "Homme" },
    ],
  },
];

const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  green: { bg: "#557B53", border: "#557B53", text: "#fff", lightBg: "#E4EDDD" },
  purple: { bg: "#8E7CB8", border: "#8E7CB8", text: "#fff", lightBg: "#ECE7F5" },
  gold: { bg: "#C58A3D", border: "#C58A3D", text: "#fff", lightBg: "#FBEEDD" },
};

const SCALE_LABELS = ["", "😔", "😕", "😐", "🙂", "😊"];

export default function OnboardingClient({ userId }: { userId: number }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [showEmergency, setShowEmergency] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = STEPS[step];
  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  const getValue = (id: keyof OnboardingAnswers) => answers[id];

  const isStepValid = () => {
    if (!current.required) return true;
    const val = getValue(current.id);
    if (current.type === "multi") return Array.isArray(val) && (val as string[]).length > 0;
    return Boolean(val);
  };

  const handleSingle = (value: string) => {
    if (current.id === "safety" && value === "oui") {
      setShowEmergency(true);
    } else {
      setShowEmergency(false);
    }
    setAnswers((prev) => ({ ...prev, [current.id]: value } as OnboardingAnswers));
  };

  const handleMulti = (value: string) => {
    const prev_vals = (answers[current.id] as string[] | undefined) ?? [];
    const next = prev_vals.includes(value)
      ? prev_vals.filter((v) => v !== value)
      : [...prev_vals, value];
    setAnswers((prev) => ({ ...prev, [current.id]: next } as OnboardingAnswers));
  };

  const handleNext = () => {
    if (step < total - 1) {
      setShowEmergency(false);
      setStep((s) => s + 1);
    } else {
      startTransition(async () => {
        await saveOnboardingAnswers(userId, answers);
      });
    }
  };

  const handleBack = () => {
    setShowEmergency(false);
    setStep((s) => s - 1);
  };

  const isSelected = (value: string) => {
    const val = getValue(current.id);
    if (Array.isArray(val)) return val.includes(value);
    return val === value;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--kk-bg)" }}>
      {/* Header */}
      <header className="px-5 py-4 flex items-center gap-3">
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          K-Kouma
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "var(--kk-border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--kk-purple)" }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          {/* Step counter */}
          <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: "var(--kk-muted)" }}>
            Étape {step + 1} sur {total}
          </p>

          {/* Title */}
          <h2
            className="text-2xl font-bold mb-2 leading-snug"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="text-sm mb-7" style={{ color: "var(--kk-muted)" }}>
              {current.subtitle}
            </p>
          )}
          {!current.subtitle && <div className="mb-7" />}

          {/* Single / Safety options — large cards if has desc, pills otherwise */}
          {(current.type === "single" || current.type === "safety") && (
            <div className={current.options[0]?.desc ? "space-y-3" : "flex flex-wrap gap-2"}>
              {current.options.map((opt) => {
                const selected = isSelected(opt.value);
                const accent = opt.accent ? ACCENT_STYLES[opt.accent] : null;

                if (opt.desc) {
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSingle(opt.value)}
                      className="w-full text-left p-4 rounded-2xl transition-all"
                      style={{
                        border: selected
                          ? `2px solid ${accent?.border ?? "var(--kk-purple)"}`
                          : "1.5px solid var(--kk-border)",
                        background: selected
                          ? (accent?.lightBg ?? "var(--kk-purple-light)")
                          : "#fff",
                        boxShadow: selected ? "none" : "0 2px 8px rgba(60,70,55,0.04)",
                      }}
                    >
                      <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                }

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSingle(opt.value)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                    style={{
                      border: selected ? "none" : "1.5px solid var(--kk-border-mid)",
                      background: selected
                        ? (opt.emergency ? "#C0392B" : "var(--kk-purple)")
                        : "#fff",
                      color: selected ? "#fff" : "var(--kk-mid)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi select — chips */}
          {current.type === "multi" && (
            <div className="flex flex-wrap gap-2">
              {current.options.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleMulti(opt.value)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                    style={{
                      border: selected ? "none" : "1.5px solid var(--kk-border-mid)",
                      background: selected ? "var(--kk-green)" : "#fff",
                      color: selected ? "#fff" : "var(--kk-mid)",
                    }}
                  >
                    {selected && (
                      <span className="mr-1.5">✓</span>
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scale */}
          {current.type === "scale" && (
            <div className="flex gap-2 flex-wrap">
              {current.options.map((opt) => {
                const selected = isSelected(opt.value);
                const num = Number(opt.value);
                const hue = num <= 2 ? "var(--kk-gold)" : num === 3 ? "var(--kk-muted)" : "var(--kk-green)";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSingle(opt.value)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all min-w-13"
                    style={{
                      border: selected ? `2px solid ${hue}` : "1.5px solid var(--kk-border)",
                      background: selected ? "#fff" : "#fff",
                      boxShadow: selected ? `0 0 0 3px ${hue}22` : "none",
                    }}
                  >
                    <span className="text-2xl">{SCALE_LABELS[num]}</span>
                    <span className="text-xs font-semibold" style={{ color: selected ? hue : "var(--kk-faint)" }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Emergency alert */}
          {showEmergency && (
            <div
              className="mt-5 rounded-2xl p-4 text-sm"
              style={{ background: "#FFF1F0", border: "1.5px solid #FFCAC8" }}
            >
              <p className="font-bold mb-1" style={{ color: "#C0392B" }}>
                Votre sécurité est notre priorité
              </p>
              <p style={{ color: "#8B2020" }}>
                Si vous êtes en danger immédiat, appelez le{" "}
                <strong>15</strong> (SAMU) ou le{" "}
                <strong>17</strong> (Police). Vous pouvez continuer à utiliser
                K-Kouma pour un soutien professionnel.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="kk-btn-outline"
                disabled={isPending}
              >
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid() || isPending}
              className="kk-btn-purple flex-1"
            >
              {isPending
                ? "Enregistrement…"
                : step === total - 1
                ? "Voir les psychologues →"
                : "Continuer →"}
            </button>
          </div>

          {/* Skip for non-required */}
          {!current.required && !getValue(current.id) && (
            <button
              type="button"
              onClick={handleNext}
              className="w-full text-center text-xs mt-3 font-semibold"
              style={{ color: "var(--kk-muted)" }}
            >
              Passer cette étape
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
