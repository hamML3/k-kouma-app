'use client'

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Data ───────────────────────────────────────────────────────────────── */
type Quiz = {
  key: string;
  emoji: string;
  label: string;
  color: string;
  colorLight: string;
  inverted: boolean;
  levelLabels: [string, string, string, string]; // faible → élevé
  questions: string[];
};

const QUIZZES: Quiz[] = [
  {
    key: "stress",
    emoji: "🌿",
    label: "Stress",
    color: "#557B53",
    colorLight: "#E4EDDD",
    inverted: false,
    levelLabels: ["Situation stable", "Vigilance légère", "Impact modéré", "Stress élevé"],
    questions: [
      "Je me sens tendu(e) même sans raison précise",
      "J'ai du mal à me détendre",
      "Je me sens facilement dépassé(e)",
      "Mon corps est souvent crispé (nuque, épaules…)",
      "Je pense trop aux choses à faire",
      "Je me sens pressé(e) en permanence",
      "J'ai du mal à « couper » mentalement",
      "Les imprévus me stressent fortement",
      "Je me sens fatigué(e) à cause de la tension",
      "Je me sens sous pression même au repos",
    ],
  },
  {
    key: "anxiete",
    emoji: "😰",
    label: "Anxiété",
    color: "#4A7C9B",
    colorLight: "#E0EEF7",
    inverted: false,
    levelLabels: ["Situation stable", "Vigilance légère", "Anxiété modérée", "Anxiété élevée"],
    questions: [
      "Je m'inquiète pour des choses qui ne sont pas encore arrivées",
      "J'ai des pensées difficiles à contrôler",
      "Je ressens des peurs sans raison claire",
      "Mon cœur bat vite sans effort physique",
      "J'ai du mal à me rassurer",
      "J'anticipe souvent le pire",
      "Je ressens une tension interne constante",
      "J'évite certaines situations par peur",
      "J'ai des pensées répétitives qui tournent en boucle",
      "Je me sens en alerte sans danger réel",
    ],
  },
  {
    key: "depression",
    emoji: "🌧️",
    label: "Dépression",
    color: "#6B8BA4",
    colorLight: "#E8EFF4",
    inverted: false,
    levelLabels: ["Situation stable", "Humeur basse légère", "Impact modéré", "Niveau élevé"],
    questions: [
      "Je ressens peu de plaisir dans mes activités",
      "Je me sens souvent triste ou vide",
      "Je manque d'énergie",
      "Je me sens inutile ou sans valeur",
      "J'ai perdu l'envie de faire des choses",
      "Je me sens isolé(e) même entouré(e)",
      "Mon moral est souvent bas",
      "J'ai du mal à me projeter positivement",
      "Je me sens ralenti(e) dans mes actions",
      "Je me sens découragé(e) facilement",
    ],
  },
  {
    key: "burnout",
    emoji: "🔥",
    label: "Burn-out",
    color: "#C0392B",
    colorLight: "#FDECEA",
    inverted: false,
    levelLabels: ["Situation stable", "Fatigue légère", "Épuisement modéré", "Burn-out élevé"],
    questions: [
      "Je me sens épuisé(e) par mes responsabilités",
      "Même après repos, je reste fatigué(e)",
      "Je n'ai plus d'énergie pour travailler",
      "Je me sens détaché(e) de mes tâches",
      "J'ai l'impression de « tenir mais sans force »",
      "Je suis irrité(e) facilement au travail",
      "Je me sens dépassé(e) par mes obligations",
      "Je manque de motivation professionnelle",
      "Je fais les choses automatiquement sans engagement",
      "Je me sens vidé(e) mentalement",
    ],
  },
  {
    key: "tdah",
    emoji: "⚡",
    label: "TDAH",
    color: "#E67E22",
    colorLight: "#FEF0E3",
    inverted: false,
    levelLabels: ["Peu de signaux", "Signaux légers", "Signaux modérés", "Signaux forts"],
    questions: [
      "J'ai du mal à rester concentré(e) longtemps",
      "Je commence des tâches sans les finir",
      "Je suis facilement distrait(e)",
      "J'oublie souvent des choses importantes",
      "Je procrastine même des tâches simples",
      "Mon esprit saute d'une pensée à l'autre",
      "J'ai du mal à m'organiser",
      "Je perds souvent des objets",
      "Je me sens mentalement dispersé(e)",
      "J'ai du mal à suivre des instructions longues",
    ],
  },
  {
    key: "autisme",
    emoji: "🧩",
    label: "Autisme",
    color: "#8E7CB8",
    colorLight: "#ECE7F5",
    inverted: false,
    levelLabels: ["Peu de traits", "Traits légers", "Traits modérés", "Traits forts"],
    questions: [
      "J'ai du mal à comprendre les sous-entendus sociaux",
      "Les interactions sociales me fatiguent vite",
      "Je préfère les routines stables",
      "Les bruits forts ou lumières me dérangent",
      "Je préfère souvent être seul(e)",
      "J'ai des intérêts très spécifiques et intenses",
      "J'ai du mal à comprendre les émotions des autres",
      "Je me sens différent(e) socialement",
      "Les changements imprévus me perturbent",
      "Je préfère les environnements prévisibles",
    ],
  },
  {
    key: "estime",
    emoji: "💛",
    label: "Estime de soi",
    color: "#C58A3D",
    colorLight: "#FBEEDD",
    inverted: true,
    levelLabels: ["Estime forte", "Estime satisfaisante", "Estime fragilisée", "Estime basse"],
    questions: [
      "Je me sens capable de réussir",
      "J'ai confiance en mes décisions",
      "Je me respecte dans mes choix",
      "Je me sens digne d'amour et de respect",
      "Je m'accepte tel(le) que je suis",
      "Je me compare peu aux autres",
      "Je reconnais mes qualités",
      "Je me sens légitime dans ce que je fais",
      "Je m'autorise à échouer sans me dévaloriser",
      "Je me sens globalement satisfait(e) de moi",
    ],
  },
  {
    key: "sommeil",
    emoji: "😴",
    label: "Qualité du sommeil",
    color: "#3D5A87",
    colorLight: "#E3EAF4",
    inverted: false,
    levelLabels: ["Sommeil de qualité", "Légères difficultés", "Perturbations modérées", "Sommeil très perturbé"],
    questions: [
      "J'ai du mal à m'endormir",
      "Je me réveille la nuit",
      "Je me réveille fatigué(e)",
      "Mon sommeil est léger",
      "Je pense beaucoup avant de dormir",
      "Je me réveille trop tôt",
      "Je dors moins de 6–7h en moyenne",
      "Mon sommeil n'est pas réparateur",
      "Je fais des cauchemars ou rêves agités",
      "Je somnole dans la journée",
    ],
  },
  {
    key: "solitude",
    emoji: "🫂",
    label: "Solitude",
    color: "#B85E7C",
    colorLight: "#F8E8EE",
    inverted: false,
    levelLabels: ["Lien social satisfaisant", "Légère solitude", "Solitude modérée", "Isolement important"],
    questions: [
      "Je me sens seul(e) même entouré(e)",
      "Je manque de soutien émotionnel",
      "Je n'ai pas quelqu'un à qui parler librement",
      "Je me sens incompris(e)",
      "Je me sens isolé(e) socialement",
      "Je ressens un vide relationnel",
      "J'ai peu d'interactions profondes",
      "Je me sens mis(e) à l'écart",
      "Je souhaite plus de connexions humaines",
      "Je ressens un manque affectif",
    ],
  },
  {
    key: "emotions",
    emoji: "🌊",
    label: "Gestion des émotions",
    color: "#2E86AB",
    colorLight: "#E0F0F7",
    inverted: false,
    levelLabels: ["Bonne régulation", "Régulation légèrement difficile", "Difficultés modérées", "Difficultés importantes"],
    questions: [
      "Mes émotions prennent souvent le dessus",
      "J'ai du mal à me calmer quand je suis stressé(e)",
      "Je réagis fortement sous émotion",
      "Je rumine longtemps après un événement",
      "Je peux passer rapidement d'une émotion à une autre",
      "Je me sens submergé(e) par mes émotions",
      "J'ai du mal à exprimer ce que je ressens",
      "Je garde trop mes émotions à l'intérieur",
      "Je me sens instable émotionnellement",
      "Je retrouve difficilement mon calme",
    ],
  },
  {
    key: "bienetre",
    emoji: "🌱",
    label: "Bien-être global",
    color: "#557B53",
    colorLight: "#E4EDDD",
    inverted: true,
    levelLabels: ["Excellent bien-être", "Bien-être satisfaisant", "Bien-être fragilisé", "Bien-être faible"],
    questions: [
      "Je me sens globalement bien dans ma vie",
      "J'ai un bon équilibre vie personnelle / pro",
      "Je me sens aligné(e) avec mes choix",
      "J'ai de l'énergie au quotidien",
      "Je ressens de la satisfaction dans ma vie",
      "Je prends soin de moi régulièrement",
      "Je me sens en paix intérieure",
      "J'ai des projets qui me motivent",
      "Je ressens de la gratitude",
      "Je me sens en contrôle de ma vie",
    ],
  },
];

const ANSWERS = [
  { label: "Jamais",                value: 0 },
  { label: "Parfois",               value: 1 },
  { label: "Souvent",               value: 2 },
  { label: "Très souvent",          value: 3 },
];

/* ─── Score interpretation ───────────────────────────────────────────────── */
function interpret(score: number, quiz: Quiz) {
  const effectiveScore = quiz.inverted ? 30 - score : score;
  let idx: number;
  if (effectiveScore <= 7.5)       idx = 0;
  else if (effectiveScore <= 15)   idx = 1;
  else if (effectiveScore <= 22.5) idx = 2;
  else                             idx = 3;

  const colors   = ["#557B53", "#C58A3D", "#E67E22", "#C0392B"];
  const bgColors = ["#E4EDDD",  "#FBEEDD", "#FEF0E3",  "#FDECEA"];
  const pct      = Math.round((score / 30) * 100);

  return { idx, label: quiz.levelLabels[idx], color: colors[idx], bg: bgColors[idx], pct, effectiveScore };
}

/* ─── Logo ───────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#557B53" />
      <circle cx="18" cy="13" r="5" fill="#fff" opacity="0.9" />
      <path d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/* ─── Topic picker ───────────────────────────────────────────────────────── */
function TopicPicker({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <header
        className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
        style={{ background: "rgba(246,242,234,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EDE8DC" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-bold text-base" style={{ fontFamily: "var(--font-lora)", color: "#2C342E" }}>K-Kouma</span>
        </Link>
        <Link href="/" className="text-sm font-semibold" style={{ color: "#8A9183" }}>← Accueil</Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}>
            Mieux se connaître
          </h1>
          <p className="text-sm" style={{ color: "#8A9183" }}>
            Choisissez un thème pour commencer votre quiz gratuit · 10 questions · 3 minutes
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {QUIZZES.map((q) => (
            <button
              key={q.key}
              onClick={() => onSelect(q.key)}
              className="rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-md"
              style={{ background: "#fff", border: "1px solid #EDE8DC" }}
            >
              <span className="text-3xl mb-2">{q.emoji}</span>
              <p className="text-xs font-bold leading-tight" style={{ color: "#1F2E20" }}>{q.label}</p>
              <p className="text-[10px] mt-1 font-semibold" style={{ color: q.color }}>Quiz gratuit</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ─── Quiz flow ──────────────────────────────────────────────────────────── */
function QuizFlow({ quiz, onRestart }: { quiz: Quiz; onRestart: () => void }) {
  const [step, setStep]       = useState<"quiz" | "results">("quiz");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const totalQuestions = quiz.questions.length;
  const progress = ((current) / totalQuestions) * 100;

  const handleAnswer = useCallback((value: number) => {
    setSelected(value);
    setTimeout(() => {
      const next = [...answers, value];
      if (current + 1 >= totalQuestions) {
        setAnswers(next);
        setStep("results");
      } else {
        setAnswers(next);
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 350);
  }, [answers, current, totalQuestions]);

  const handleBack = () => {
    if (current === 0) return;
    setAnswers((a) => a.slice(0, -1));
    setCurrent((c) => c - 1);
    setSelected(null);
  };

  const totalScore = answers.reduce((s, a) => s + a, 0);
  const result = step === "results" ? interpret(totalScore, quiz) : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
        style={{ background: "rgba(246,242,234,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EDE8DC" }}
      >
        <button onClick={onRestart} className="flex items-center gap-2">
          <Logo />
          <span className="font-bold text-base" style={{ fontFamily: "var(--font-lora)", color: "#2C342E" }}>K-Kouma</span>
        </button>
        <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: quiz.colorLight, color: quiz.color }}>
          {quiz.emoji} {quiz.label}
        </span>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8">

        {/* QUIZ */}
        {step === "quiz" && (
          <>
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-xs font-semibold mb-2" style={{ color: "#8A9183" }}>
                <span>Question {current + 1} / {totalQuestions}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EDE8DC" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: quiz.color }}
                />
              </div>
            </div>

            {/* Question card */}
            <div
              className="rounded-3xl p-7 mb-6"
              style={{ background: "#fff", border: "1px solid #EDE8DC", boxShadow: "0 8px 32px rgba(60,70,55,0.07)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5"
                style={{ background: quiz.colorLight }}
              >
                {quiz.emoji}
              </div>
              <p
                className="text-xl font-bold leading-snug"
                style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
              >
                {quiz.questions[current]}
              </p>
            </div>

            {/* Answer buttons */}
            <div className="space-y-3">
              {ANSWERS.map((a) => {
                const isSelected = selected === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => handleAnswer(a.value)}
                    disabled={selected !== null}
                    className="w-full rounded-2xl px-6 py-4 flex items-center justify-between text-left transition-all"
                    style={{
                      background: isSelected ? quiz.colorLight : "#fff",
                      border: `1.5px solid ${isSelected ? quiz.color : "#EDE8DC"}`,
                      transform: isSelected ? "scale(1.01)" : "scale(1)",
                      opacity: selected !== null && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: isSelected ? quiz.color : "#1F2E20" }}>
                      {a.label}
                    </span>
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: isSelected ? quiz.color : "#F6F2EA", color: isSelected ? "#fff" : "#8A9183" }}
                    >
                      {a.value}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Back button */}
            {current > 0 && selected === null && (
              <button
                onClick={handleBack}
                className="mt-5 text-sm font-semibold flex items-center gap-1"
                style={{ color: "#8A9183" }}
              >
                ← Question précédente
              </button>
            )}
          </>
        )}

        {/* RESULTS */}
        {step === "results" && result && (
          <>
            {/* Score card */}
            <div
              className="rounded-3xl p-7 mb-5 text-center"
              style={{ background: result.bg, border: `2px solid ${result.color}` }}
            >
              <p className="text-5xl mb-3">{quiz.emoji}</p>
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: result.color }}>
                Résultat — {quiz.label}
              </p>
              <p className="text-5xl font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}>
                {totalScore}<span className="text-xl font-semibold" style={{ color: "#8A9183" }}> / 30</span>
              </p>
              <div
                className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mt-2"
                style={{ background: result.color, color: "#fff" }}
              >
                {result.label}
              </div>
            </div>

            {/* Score bar */}
            <div className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: "1px solid #EDE8DC" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "#1F2E20" }}>Votre score détaillé</p>
              <div className="h-4 rounded-full overflow-hidden mb-2" style={{ background: "#EDE8DC" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${result.pct}%`, background: result.color }}
                />
              </div>
              <div className="flex justify-between text-xs" style={{ color: "#8A9183" }}>
                <span>0 — Stable</span>
                <span>30 — Élevé</span>
              </div>

              {/* Répartition des niveaux */}
              <div className="grid grid-cols-4 gap-1 mt-4">
                {[
                  { label: "Faible",  range: "0–7.5",   color: "#557B53", bg: "#E4EDDD" },
                  { label: "Léger",   range: "7.5–15",  color: "#C58A3D", bg: "#FBEEDD" },
                  { label: "Modéré",  range: "15–22.5", color: "#E67E22", bg: "#FEF0E3" },
                  { label: "Élevé",   range: "22.5–30", color: "#C0392B", bg: "#FDECEA" },
                ].map((l, i) => (
                  <div
                    key={l.label}
                    className="rounded-xl p-2 text-center"
                    style={{
                      background: i === result.idx ? l.bg : "#F6F2EA",
                      border: i === result.idx ? `1.5px solid ${l.color}` : "1px solid #EDE8DC",
                    }}
                  >
                    <p className="text-[10px] font-bold" style={{ color: i === result.idx ? l.color : "#8A9183" }}>
                      {l.label}
                    </p>
                    <p className="text-[9px]" style={{ color: "#A8AEA1" }}>{l.range}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice block */}
            <div
              className="rounded-2xl p-5 mb-5"
              style={{ background: result.idx >= 2 ? "#ECE7F5" : "#E4EDDD", border: `1px solid ${result.idx >= 2 ? "#C8BCEB" : "#C2D9BC"}` }}
            >
              <p className="text-sm font-bold mb-1" style={{ color: "#1F2E20" }}>
                {result.idx === 0 && "✅ Votre niveau est stable"}
                {result.idx === 1 && "⚠️ Quelques signaux à surveiller"}
                {result.idx === 2 && "🧭 Un accompagnement pourrait vous aider"}
                {result.idx === 3 && "🙏 Consulter un professionnel est recommandé"}
              </p>
              <p className="text-sm" style={{ color: "#5C645B" }}>
                {result.idx === 0 && "Continuez à prendre soin de vous. Ces résultats indiquent une situation globalement équilibrée."}
                {result.idx === 1 && "Certains signaux méritent votre attention. Un espace d'écoute professionnelle peut vous aider à mieux comprendre ce que vous vivez."}
                {result.idx === 2 && "Ce niveau a un impact fonctionnel possible sur votre quotidien. Parler à un psychologue peut vous apporter un soulagement significatif."}
                {result.idx === 3 && "Ce niveau de difficulté mérite un soutien professionnel adapté. Nos psychologues sont formés pour vous accompagner avec bienveillance."}
              </p>
            </div>

            {/* Note importante */}
            <p className="text-xs text-center mb-6" style={{ color: "#A8AEA1" }}>
              ⚠️ Ce quiz est un outil d&apos;auto-évaluation informatif et ne remplace pas un diagnostic clinique.
            </p>

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href="/register"
                className="block w-full text-center py-4 rounded-2xl font-bold text-sm"
                style={{ background: "#557B53", color: "#fff" }}
              >
                Consulter un psychologue gratuitement →
              </Link>
              <button
                onClick={() => {
                  setStep("quiz");
                  setCurrent(0);
                  setAnswers([]);
                  setSelected(null);
                }}
                className="block w-full text-center py-3.5 rounded-2xl font-bold text-sm"
                style={{ background: "#fff", color: "#5C645B", border: "1px solid #EDE8DC" }}
              >
                Refaire ce quiz
              </button>
              <button
                onClick={onRestart}
                className="block w-full text-center py-3 text-sm font-semibold"
                style={{ color: "#8A9183" }}
              >
                Choisir un autre thème
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function QuizClient({ initialTopic }: { initialTopic: string | null }) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => {
      if (initialTopic && QUIZZES.find((q) => q.key === initialTopic)) return initialTopic;
      return null;
    }
  );

  const quiz = selectedKey ? QUIZZES.find((q) => q.key === selectedKey) ?? null : null;

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    router.replace(`/quiz?topic=${key}`, { scroll: false });
  };

  const handleRestart = () => {
    setSelectedKey(null);
    router.replace("/quiz", { scroll: false });
  };

  if (!quiz) return <TopicPicker onSelect={handleSelect} />;
  return <QuizFlow quiz={quiz} onRestart={handleRestart} />;
}
