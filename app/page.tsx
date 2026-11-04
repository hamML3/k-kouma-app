import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/Icon";
import { getSpecialtyIcon } from "@/lib/icons";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { SESSION_PRICING, type TherapyType } from "@/lib/pricing";
import { getPlatformSettings } from "@/lib/platformSettings";

// Page statique régénérée au plus toutes les 60s (ISR) : assez réactif pour
// un réglage admin (ex. showLifeCoachCard), sans rendre la page d'accueil
// entièrement dynamique. Un changement depuis /admin/settings force en plus
// une revalidation immédiate (revalidatePath("/")).
export const revalidate = 60;

const PRICING_DISPLAY: Record<TherapyType, { color: string; bg: string }> = {
  individuelle: { color: "#557B53", bg: "#E4EDDD" },
  couple: { color: "#8E7CB8", bg: "#ECE7F5" },
  enfant: { color: "#C58A3D", bg: "#FBEEDD" },
};

function fcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 grid md:grid-cols-2 gap-10 items-center">
      {/* Text */}
      <div>
        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight mb-5"
          style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
        >
          Prenez soin de votre <span style={{ color: "#557B53" }}>bien-être mental</span>
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: "#5C645B" }}>
          K-Kouma vous met en relation avec des psychologues qualifiés pour vous écouter,
          vous soutenir et vous accompagner en toute confidentialité.
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-4 mb-8">
          {[
            { icon: "🔒", title: "Confidentiel", desc: "Vos échanges sont 100 % sécurisés" },
            { icon: "✅", title: "Psychologues vérifiés", desc: "Professionnels qualifiés à votre écoute" },
            { icon: "🌍", title: "Accessible", desc: "Partout en Afrique de l'Ouest" },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-2">
              <span className="text-lg mt-0.5">{b.icon}</span>
              <div>
                <p className="text-xs font-bold" style={{ color: "#2C342E" }}>{b.title}</p>
                <p className="text-xs" style={{ color: "#8A9183" }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link
            href="/register"
            className="font-bold px-7 py-3.5 rounded-full text-sm"
            style={{ background: "#557B53", color: "#fff" }}
          >
            Commencer gratuitement →
          </Link>
          <Link
            href="/therapists"
            className="font-bold px-7 py-3.5 rounded-full text-sm border"
            style={{ borderColor: "#D8D2C4", color: "#5C645B" }}
          >
            Voir les psychologues
          </Link>
        </div>
      </div>

      {/* Image */}
      <div className="relative h-80 md:h-[420px] rounded-3xl overflow-hidden">
        <Image
          src="/images/therapy-session.jpg"
          alt="Séance de psychologie"
          fill
          className="object-cover"
          priority
        />
      </div>
    </section>
  );
}

/* ─── Therapy types ──────────────────────────────────────────────────────── */
function TherapyTypes({ showLifeCoachCard }: { showLifeCoachCard: boolean }) {
  const allTypes = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="15" r="7" stroke="#557B53" strokeWidth="2" />
          <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#557B53" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      bg: "#E4EDDD",
      title: "Thérapie individuelle",
      lifeCoach: false,
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="14" cy="14" r="6" stroke="#8E7CB8" strokeWidth="2" />
          <circle cx="26" cy="14" r="6" stroke="#8E7CB8" strokeWidth="2" />
          <path d="M2 34c0-6.627 5.373-12 12-12h12c6.627 0 12 5.373 12 12" stroke="#8E7CB8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      bg: "#ECE7F5",
      title: "Thérapie de couple",
      lifeCoach: false,
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="13" r="6" stroke="#C58A3D" strokeWidth="2" />
          <circle cx="32" cy="16" r="4" stroke="#C58A3D" strokeWidth="2" />
          <path d="M6 34c0-6.627 5.373-12 12-12h4c6.627 0 12 5.373 12 12" stroke="#C58A3D" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      bg: "#FBEEDD",
      title: "Adolescent / enfant",
      lifeCoach: false,
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="13" r="7" stroke="#4A7C9B" strokeWidth="2" />
          <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#4A7C9B" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 9v4l2.5 2.5" stroke="#4A7C9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      bg: "#E0EEF7",
      title: "Coach de vie / Conseil",
      lifeCoach: true,
    },
  ];
  const types = showLifeCoachCard ? allTypes : allTypes.filter((t) => !t.lifeCoach);

  return (
    <section id="mission" style={{ background: "#fff", scrollMarginTop: "5rem" }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-2"
          style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
        >
          Comment pouvons-nous vous aider aujourd&apos;hui ?
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: "#8A9183" }}>
          Choisissez le type de thérapie qui vous correspond
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {types.map((t) => (
            <Link
              key={t.title}
              href="/register"
              className="rounded-2xl p-7 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: t.bg, border: "1.5px solid transparent" }}
            >
              <div className="mb-4">{t.icon}</div>
              <p className="font-bold" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>{t.title}</p>
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/register"
            className="font-bold px-8 py-3.5 rounded-full text-sm inline-flex items-center gap-2"
            style={{ background: "#8E7CB8", color: "#fff" }}
          >
            Commencer <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Wellbeing quizzes ──────────────────────────────────────────────────── */
function WellbeingSection() {
  const topics: { icon: IconName; label: string; key: string; color: string; bg: string }[] = [
    { icon: "overwhelm", label: "Stress",             key: "stress",     color: "#557B53", bg: "#E4EDDD" },
    { icon: "anxiety",   label: "Anxiété",             key: "anxiete",    color: "#4A7C9B", bg: "#E0EEF7" },
    { icon: "journal",   label: "Dépression",          key: "depression", color: "#6B8BA4", bg: "#E8EFF4" },
    { icon: "burnout",   label: "Burn-out",            key: "burnout",    color: "#C0392B", bg: "#FDECEA" },
    { icon: "energy",    label: "TDAH",                key: "tdah",       color: "#E67E22", bg: "#FEF0E3" },
    { icon: "puzzle",    label: "Autisme",             key: "autisme",    color: "#8E7CB8", bg: "#ECE7F5" },
    { icon: "self-care", label: "Estime de soi",       key: "estime",     color: "#C58A3D", bg: "#FBEEDD" },
    { icon: "sleep",     label: "Qualité du sommeil",  key: "sommeil",    color: "#3D5A87", bg: "#E3EAF4" },
    { icon: "user",      label: "Solitude",            key: "solitude",   color: "#B85E7C", bg: "#F8E8EE" },
    { icon: "chat-alt",  label: "Émotions",            key: "emotions",   color: "#2E86AB", bg: "#E0F0F7" },
    { icon: "globe",     label: "Bien-être global",    key: "bienetre",   color: "#557B53", bg: "#E4EDDD" },
  ];

  return (
    <section style={{ background: "var(--kk-bg)" }}>
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
          >
            Mieux se connaître
          </h2>
          <p className="text-sm mb-8" style={{ color: "#8A9183" }}>
            Explorez votre bien-être émotionnel gratuitement.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {topics.map((t) => (
              <Link
                key={t.key}
                href={`/quiz?topic=${t.key}`}
                className="rounded-2xl p-3 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-sm"
                style={{ background: "#fff", border: "1px solid #EDE8DC" }}
              >
                <div
                  className="w-10 h-10 mb-1.5 rounded-full flex items-center justify-center"
                  style={{ background: t.bg }}
                >
                  <Icon name={t.icon} size={19} color={t.color} />
                </div>
                <p className="text-xs font-bold leading-tight" style={{ color: "#2C342E" }}>{t.label}</p>
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#557B53" }}>Quiz gratuit</p>
              </Link>
            ))}
          </div>

          <div
            className="mt-5 rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ background: "#E4EDDD", border: "1px solid #C2D9BC" }}
          >
            <p className="text-sm" style={{ color: "#2C342E" }}>
              Prenez quelques minutes pour répondre à un quiz.
              Mieux vous comprendre est le premier pas vers le mieux-être.
            </p>
            <Link
              href="/quiz"
              className="shrink-0 font-bold text-sm px-4 py-2.5 rounded-full whitespace-nowrap"
              style={{ background: "#557B53", color: "#fff" }}
            >
              Faire un test gratuit →
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="relative h-80 md:h-[420px] rounded-3xl overflow-hidden">
          <Image
            src="/images/thinking.jpg"
            alt="Réflexion et bien-être"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Therapists preview ─────────────────────────────────────────────────── */
function TherapistsPreview() {
  const therapists = [
    { name: "Dr. Awa Diakité",    specialty: "Anxiété, Stress",  langs: ["Français", "Bambara", "Soraï"],          consults: 412, rating: 4.9, color: "#557B53" },
    { name: "Dr. Mamadou Traoré", specialty: "Dépression",       langs: ["Français", "Bambara", "Peulh"],          consults: 538, rating: 4.8, color: "#8E7CB8" },
    { name: "Dr. Néné Koffi",     specialty: "Couples",          langs: ["Français", "Malinké", "Bambara"],        consults: 367, rating: 4.9, color: "#C58A3D" },
    { name: "Dr. Idrissa Koné",   specialty: "Enfants",          langs: ["Français", "Peulh", "Malinké"],         consults: 290, rating: 4.7, color: "#4A7C9B" },
  ];

  function initials(name: string) {
    const parts = name.replace("Dr. ", "").split(" ");
    return parts.map((p) => p[0]).join("").slice(0, 2);
  }

  return (
    <section style={{ background: "#fff" }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
            >
              Nos psychologues vérifiés
            </h2>
          </div>
          <Link
            href="/therapists"
            className="text-sm font-bold hidden sm:flex items-center gap-1"
            style={{ color: "#557B53" }}
          >
            Voir tous les psychologues →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {therapists.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl p-5"
              style={{ border: "1px solid #EDE8DC", background: "#FAFAF8" }}
            >
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: t.color }}
                >
                  {initials(t.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: "#8A9183" }}>Psychologue clinicien</p>
                </div>
              </div>

              <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "#5C645B" }}>
                {(() => {
                  const icon = getSpecialtyIcon(t.specialty);
                  return icon ? <Icon name={icon} size={13} /> : null;
                })()}
                Spécialité : {t.specialty}
              </p>

              <div className="flex items-center gap-1 mb-3">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="#557B53">
                  <path d="M6 1l1.2 2.5L10 4l-2 1.9.5 2.6L6 7.2 3.5 8.5l.5-2.6L2 4l2.8-.5z" />
                </svg>
                <span className="text-xs font-bold" style={{ color: "#557B53" }}>Diplôme vérifié</span>
              </div>

              <p className="text-xs mb-2" style={{ color: "#8A9183" }}>Langues</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.langs.map((l) => (
                  <span
                    key={l}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "#E4EDDD", color: "#557B53" }}
                  >
                    {l}
                  </span>
                ))}
              </div>

              <div className="flex justify-between text-xs" style={{ color: "#8A9183" }}>
                <span>Consultations <strong style={{ color: "#1F2E20" }}>{t.consults}</strong></span>
                <span>⭐ {t.rating} / 5</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6 sm:hidden">
          <Link href="/therapists" className="text-sm font-bold" style={{ color: "#557B53" }}>
            Voir tous les psychologues →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Consultation modes ─────────────────────────────────────────────────── */
function ConsultationModes() {
  const modes: { icon: IconName; title: string; desc: string; bg: string; color: string }[] = [
    {
      icon: "chat",
      title: "Chat",
      desc: "Pour ceux qui sont timides ou veulent réfléchir avant de répondre.",
      bg: "#E4EDDD",
      color: "#557B53",
    },
    {
      icon: "headphones",
      title: "Audio",
      desc: "Pour davantage de confidentialité.",
      bg: "#ECE7F5",
      color: "#8E7CB8",
    },
    {
      icon: "video",
      title: "Vidéo",
      desc: "Pour une expérience proche du cabinet.",
      bg: "#FBEEDD",
      color: "#C58A3D",
    },
  ];

  return (
    <section id="tarifs" style={{ background: "var(--kk-bg)", scrollMarginTop: "5rem" }}>
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
          >
            Choisissez votre mode de consultation
          </h2>
          <p className="text-sm mb-8" style={{ color: "#8A9183" }}>
            Même prix, même durée, même qualité
          </p>

          <div className="flex gap-4 flex-wrap">
            {modes.map((m) => (
              <div
                key={m.title}
                className="flex-1 min-w-[140px] rounded-2xl p-5 text-center"
                style={{ background: m.bg }}
              >
                <div className="w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: "#fff" }}>
                  <Icon name={m.icon} size={22} />
                </div>
                <p className="font-bold mb-1" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>{m.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#5C645B" }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-lora)", color: "#1F2E20" }}
            >
              Offre de consultation
            </h3>
            <Link href="/subscription" className="text-sm font-bold" style={{ color: "#557B53" }}>
              Voir tous les tarifs →
            </Link>
          </div>

          <div className="space-y-4">
            {(Object.entries(SESSION_PRICING) as [TherapyType, (typeof SESSION_PRICING)[TherapyType]][]).map(
              ([type, entry]) => {
                const { color, bg } = PRICING_DISPLAY[type];
                return (
                  <div key={type} className="rounded-2xl p-4" style={{ background: bg }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm" style={{ color, fontFamily: "var(--font-lora)" }}>{entry.label}</p>
                      <span className="text-xs flex items-center gap-1" style={{ color: "#8A9183" }}>
                        <Icon name="chat" size={12} />
                        <Icon name="headphones" size={12} />
                        <Icon name="video" size={12} />
                      </span>
                    </div>
                    <p className="text-xs mb-1.5" style={{ color: "#5C645B" }}>1 séance : <strong>{fcfa(entry.single)}</strong></p>
                    <div className="text-xs" style={{ color: "#5C645B" }}>
                      {entry.pack3Was ? (
                        <p className="flex items-center gap-1.5 flex-wrap">
                          • 3 séances :
                          <s style={{ color: "#A8AEA1" }}>{fcfa(entry.pack3Was)}</s>
                          <strong style={{ color }}>{fcfa(entry.pack3)}</strong>
                          <span
                            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                            style={{ background: color, color: "#fff" }}
                          >
                            Offre
                          </span>
                        </p>
                      ) : (
                        <p>• 3 séances : <strong>{fcfa(entry.pack3)}</strong></p>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Security + quote ───────────────────────────────────────────────────── */
function SecuritySection() {
  return (
    <section style={{ background: "#fff" }}>
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        {/* Security */}
        <div className="space-y-5">
          <div
            className="rounded-2xl p-6 flex items-start gap-4"
            style={{ background: "#E4EDDD", border: "1px solid #C2D9BC" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#557B53" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L4 5v5c0 4.418 3.134 8.56 7 9.8C14.866 18.56 18 14.418 18 10V5l-7-3z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M8 11l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>
                Votre sécurité est notre priorité
              </p>
              <p className="text-sm" style={{ color: "#5C645B" }}>
                Si vous rencontrez un problème avec un psychologue, vous pouvez le signaler en toute confidentialité.
              </p>
              <Link href="/security" className="text-sm font-bold mt-2 inline-block" style={{ color: "#557B53" }}>
                En savoir plus →
              </Link>
            </div>
          </div>

          <div
            className="rounded-2xl p-6 flex items-start gap-4"
            style={{ background: "#ECE7F5", border: "1px solid #C8BCEB" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#8E7CB8" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="4" y="9" width="14" height="10" rx="2" stroke="#fff" strokeWidth="1.8" />
                <path d="M8 9V7a4 4 0 018 0v2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>
                Plateforme 100 % sécurisée
              </p>
              <p className="text-sm" style={{ color: "#5C645B" }}>
                Vos données personnelles et vos échanges sont protégés. Confidentialité garantie.
              </p>
            </div>
          </div>
        </div>

        {/* Quote + image */}
        <div className="relative">
          <div className="relative h-72 rounded-3xl overflow-hidden mb-5">
            <Image
              src="/images/meditation.jpg"
              alt="Bien-être mental"
              fill
              className="object-cover"
            />
          </div>
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--kk-bg)", border: "1px solid #EDE8DC" }}
          >
            <p className="text-2xl mb-2" style={{ color: "#8E7CB8" }}>&ldquo;</p>
            <p className="text-base font-semibold leading-relaxed mb-1" style={{ color: "#1F2E20", fontFamily: "var(--font-lora)" }}>
              Parler, c&apos;est déjà se libérer.
            </p>
            <p className="text-sm" style={{ color: "#8A9183" }}>
              Nous sommes là pour vous écouter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default async function LandingPage() {
  // Page statique/ISR : une panne de connexion DB au moment de la (re)génération
  // ne doit jamais faire échouer la page d'accueil — on retombe sur l'affichage
  // par défaut (carte "Coach de vie" visible) plutôt que de bloquer le build.
  let showLifeCoachCard = true;
  try {
    const settings = await getPlatformSettings();
    showLifeCoachCard = settings?.showLifeCoachCard ?? true;
  } catch (err) {
    console.error("[platform-settings] lecture échouée pour la page d'accueil:", err);
  }

  return (
    <>
      <PublicNav />
      <main>
        <Hero />
        <TherapyTypes showLifeCoachCard={showLifeCoachCard} />
        <WellbeingSection />
        <TherapistsPreview />
        <ConsultationModes />
        <SecuritySection />
      </main>
      <PublicFooter />
    </>
  );
}
