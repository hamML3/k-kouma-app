import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="4" stroke="#557B53" strokeWidth="1.8" />
        <path d="M8 11l2.5 2.5L14 8" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bg: "#E4EDDD",
    title: "100 % confidentiel",
    desc: "Consultez sous pseudonyme. Vos échanges sont chiffrés de bout en bout.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="7" width="16" height="10" rx="2.5" stroke="#8E7CB8" strokeWidth="1.8" />
        <path d="M7 7V6a4 4 0 018 0v1" stroke="#8E7CB8" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bg: "#ECE7F5",
    title: "Mobile Money",
    desc: "Payez facilement par Orange Money, Wave ou tout autre opérateur local.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#C58A3D" strokeWidth="1.8" />
        <path d="M11 7v4l2.5 2.5" stroke="#C58A3D" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bg: "#FBEEDD",
    title: "Multilingue",
    desc: "Consultez en français, bambara, peulh, malinké, soraï et bien d'autres.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="9" cy="8" r="4" stroke="#4A7C9B" strokeWidth="1.8" />
        <circle cx="17" cy="14" r="3" stroke="#4A7C9B" strokeWidth="1.8" />
        <path d="M13 18c0-2.21-1.79-4-4-4H5" stroke="#4A7C9B" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bg: "#E0EEF7",
    title: "Psychologues vérifiés",
    desc: "Chaque praticien est diplômé, vérifié et formé aux réalités culturelles locales.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="14" rx="3" stroke="#B85E7C" strokeWidth="1.8" />
        <path d="M3 9h16M8 3v4M14 3v4" stroke="#B85E7C" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bg: "#F8E8EE",
    title: "Flexibilité totale",
    desc: "Choisissez vos créneaux, changez de thérapeute, annulez à tout moment.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3L13.5 8.5H19L14.5 12L16.5 18L11 14.5L5.5 18L7.5 12L3 8.5H8.5L11 3Z" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bg: "#E4EDDD",
    title: "Première séance offerte",
    desc: "Essayez K-Kouman avec votre psychologue sans engagement ni frais initiaux.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Répondez à quelques questions",
    desc: "Notre algorithme identifie vos besoins pour trouver le psychologue idéal.",
    color: "var(--kk-green)",
  },
  {
    num: "02",
    title: "Choisissez votre psychologue",
    desc: "Parcourez des profils vérifiés, filtrez par langue et spécialité.",
    color: "var(--kk-purple)",
  },
  {
    num: "03",
    title: "Commencez à votre rythme",
    desc: "Consultez par chat, audio ou vidéo, depuis chez vous ou en déplacement.",
    color: "var(--kk-gold)",
  },
];

const PRICING = [
  {
    name: "À la séance",
    price: "Dès 10 000",
    unit: "XOF / séance",
    desc: "Payez uniquement ce que vous consommez. Parfait pour commencer.",
    features: [
      "1 séance de 45 min",
      "Vidéo, audio ou chat",
      "Psychologue certifié",
      "Paiement Mobile Money",
    ],
    cta: "Commencer",
    href: "/register/patient",
    accent: "var(--kk-green)",
    accentLight: "var(--kk-green-light)",
    highlight: false,
  },
  {
    name: "Mensuel",
    price: "35 000",
    unit: "XOF / mois",
    desc: "4 séances par mois. La régularité qui fait la différence.",
    features: [
      "4 séances de 45 min / mois",
      "Vidéo, audio ou chat",
      "Changement de thérapeute libre",
      "Priorité sur les créneaux",
      "Paiement Mobile Money",
    ],
    cta: "Choisir ce plan",
    href: "/register/patient",
    accent: "var(--kk-purple)",
    accentLight: "var(--kk-purple-light)",
    highlight: true,
  },
  {
    name: "Intensif",
    price: "60 000",
    unit: "XOF / mois",
    desc: "8 séances par mois pour un accompagnement soutenu.",
    features: [
      "8 séances de 45 min / mois",
      "Vidéo, audio ou chat",
      "Thérapeute dédié",
      "Messagerie illimitée",
      "Suivi entre les séances",
    ],
    cta: "Choisir ce plan",
    href: "/register/patient",
    accent: "var(--kk-gold)",
    accentLight: "var(--kk-gold-light)",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "A.K.",
    city: "Bamako",
    text: "J'avais peur de ne pas trouver quelqu'un qui comprenne ma culture. Avec K-Kouman, mon psychologue parle bambara et connaît nos réalités. C'est rassurant.",
    color: "var(--kk-green)",
  },
  {
    name: "F.D.",
    city: "Abidjan",
    text: "Je travaille en décalé, les rendez-vous classiques ne m'allaient pas. Là je consulte le soir depuis chez moi. Simple, discret, efficace.",
    color: "var(--kk-purple)",
  },
  {
    name: "M.S.",
    city: "Dakar",
    text: "Après trois mois sur K-Kouman je dors mieux, j'ai moins d'anxiété. Mon équipe ne sait même pas que je consulte — la confidentialité est totale.",
    color: "var(--kk-gold)",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col" style={{ background: "var(--kk-bg)" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-20 px-5 py-4"
        style={{
          background: "rgba(246,242,234,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--kk-border)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            K-Kouman
          </span>
          <nav className="flex items-center gap-5">
            <a
              href="#tarifs"
              className="text-sm font-semibold hidden sm:block"
              style={{ color: "var(--kk-mid)" }}
            >
              Tarifs
            </a>
            <Link
              href="/login"
              className="text-sm font-semibold hidden sm:block"
              style={{ color: "var(--kk-mid)" }}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="kk-btn-purple text-sm px-5 py-2.5"
              style={{ borderRadius: "24px" }}
            >
              Commencer
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-10 text-center">
        <div
          className="inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-6"
          style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
        >
          Mali · Sénégal · Côte d&apos;Ivoire · Burkina Faso · UEMOA
        </div>

        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight mb-5"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Un soutien psychologique{" "}
          <span style={{ color: "var(--kk-green)" }}>accessible à tous</span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--kk-mid)" }}
        >
          Consultez un psychologue qualifié par visio, appel ou messagerie.
          Disponible en langues locales, payable par Mobile Money.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/register/patient"
            className="kk-btn-purple px-8 py-4 text-base"
          >
            Trouver mon psychologue →
          </Link>
          <Link
            href="/register/therapist"
            className="kk-btn-outline px-8 py-4 text-base"
          >
            Je suis psychologue
          </Link>
        </div>

        <p className="text-xs" style={{ color: "var(--kk-faint)" }}>
          Inscription gratuite · Première séance offerte · Annulable à tout moment
        </p>

        {/* Hero illustration */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{ background: "var(--kk-dark)" }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
              style={{ background: "var(--kk-green)" }}
            />
            <div
              className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full opacity-10"
              style={{ background: "var(--kk-purple)" }}
            />

            <div className="relative grid sm:grid-cols-3 gap-4 text-left">
              {/* Chat bubble illustration */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--kk-purple)", color: "#fff" }}>
                    A
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white opacity-90">Dr. Aminata</p>
                    <p className="text-xs opacity-50 text-white">En ligne</p>
                  </div>
                </div>
                <div className="rounded-xl rounded-tl-none p-3 text-xs text-white opacity-80" style={{ background: "rgba(255,255,255,0.1)" }}>
                  Bonjour ! Comment vous sentez-vous aujourd&apos;hui ?
                </div>
              </div>

              {/* Session in progress */}
              <div
                className="rounded-2xl p-5 flex flex-col justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--kk-green)" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="1.8" />
                    <path d="M8 11l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-white text-sm font-bold text-center opacity-90">Séance vidéo</p>
                <p className="text-white text-xs text-center opacity-50 mt-1">45 min · Sécurisé</p>
              </div>

              {/* Stats */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <p className="text-xs font-bold opacity-50 text-white mb-3 uppercase tracking-wide">Ce mois-ci</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white opacity-60">Séances</span>
                    <span className="text-sm font-bold text-white">4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white opacity-60">Humeur</span>
                    <span className="text-sm font-bold" style={{ color: "var(--kk-gold)" }}>↑ 32%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white opacity-60">Prochain RDV</span>
                    <span className="text-xs font-bold text-white opacity-80">Lun 16h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-8 px-5" style={{ borderBottom: "1px solid var(--kk-border)" }}>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            { val: "100+", label: "Psychologues vérifiés" },
            { val: "6", label: "Langues disponibles" },
            { val: "5 pays", label: "UEMOA couverts" },
            { val: "48h", label: "Pour être mis en relation" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {s.val}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Pourquoi K-Kouman ?
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: "var(--kk-muted)" }}>
            Conçu pour la réalité africaine, pas une simple traduction d&apos;un service occidental.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="kk-card p-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  {f.icon}
                </div>
                <h3
                  className="font-bold mb-1.5"
                  style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--kk-muted)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-5" style={{ background: "var(--kk-border)" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Comment ça marche ?
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: "var(--kk-muted)" }}>
            En moins de 5 minutes, trouvez votre psychologue.
          </p>

          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-5"
                  style={{ background: step.color, color: "#fff", fontFamily: "var(--font-lora)" }}
                >
                  {step.num}
                </div>
                <h3
                  className="font-bold mb-2"
                  style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--kk-muted)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Nos formules
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: "var(--kk-muted)" }}>
            Des tarifs adaptés aux revenus locaux. Paiement par Mobile Money disponible.
          </p>

          <div className="grid sm:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-6 flex flex-col relative"
                style={{
                  background: plan.highlight ? plan.accent : "#fff",
                  border: plan.highlight ? "none" : "1.5px solid var(--kk-border)",
                  boxShadow: plan.highlight
                    ? "0 20px 60px rgba(142,124,184,0.3)"
                    : "0 6px 20px rgba(60,70,55,0.05)",
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: "var(--kk-gold)", color: "#fff" }}
                    >
                      Le plus populaire
                    </span>
                  </div>
                )}

                <p
                  className="text-sm font-bold mb-4"
                  style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "var(--kk-muted)" }}
                >
                  {plan.name}
                </p>

                <div className="mb-2">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      fontFamily: "var(--font-lora)",
                      color: plan.highlight ? "#fff" : "var(--kk-dark)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: plan.highlight ? "rgba(255,255,255,0.6)" : "var(--kk-muted)" }}
                  >
                    {plan.unit}
                  </span>
                </div>

                <p
                  className="text-sm mb-5 leading-relaxed"
                  style={{ color: plan.highlight ? "rgba(255,255,255,0.75)" : "var(--kk-mid)" }}
                >
                  {plan.desc}
                </p>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: plan.highlight ? "rgba(255,255,255,0.2)" : plan.accentLight }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l1.5 1.5L6.5 2" stroke={plan.highlight ? "#fff" : plan.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{ color: plan.highlight ? "rgba(255,255,255,0.85)" : "var(--kk-mid)" }}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className="block text-center py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: plan.highlight ? "#fff" : plan.accent,
                    color: plan.highlight ? plan.accent : "#fff",
                  }}
                >
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>

          <p className="text-xs text-center mt-6" style={{ color: "var(--kk-faint)" }}>
            Tous les prix sont en Francs CFA (XOF) · TVA incluse · Annulable à tout moment
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-5" style={{ background: "var(--kk-border)" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-10"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Ils ont franchi le pas
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="kk-card p-6">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-4"
                  style={{ background: t.color, color: "#fff" }}
                >
                  {t.name.split(".")[0]}
                </div>
                <p className="text-sm leading-relaxed mb-4 italic" style={{ color: "var(--kk-mid)" }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--kk-muted)" }}>
                  {t.name} — {t.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Therapist CTA */}
      <section className="py-14 px-5">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8"
            style={{ background: "var(--kk-dark)" }}
          >
            <div className="flex-1 text-center sm:text-left">
              <h2
                className="text-2xl font-bold mb-3 text-white"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                Vous êtes psychologue ?
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Rejoignez K-Kouman pour élargir votre patientèle en Afrique de l&apos;Ouest.
                Fixez votre tarif, gérez vos disponibilités, consultez depuis partout.
              </p>
            </div>
            <Link
              href="/register/therapist"
              className="shrink-0 px-8 py-4 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "var(--kk-green)", color: "#fff" }}
            >
              Déposer ma candidature →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-14 px-5" style={{ background: "var(--kk-border)" }}>
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Prêt à commencer ?
          </h2>
          <p className="text-sm mb-7" style={{ color: "var(--kk-muted)" }}>
            Des psychologues vérifiés, disponibles cette semaine.
          </p>
          <Link href="/register/patient" className="kk-btn-purple px-8 py-4 text-base">
            Créer mon compte gratuitement →
          </Link>
          <p className="text-xs mt-4" style={{ color: "var(--kk-faint)" }}>
            Première séance offerte · Sans engagement
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-5 py-8 text-center"
        style={{ borderTop: "1px solid var(--kk-border)" }}
      >
        <p
          className="font-bold mb-1"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          K-Kouman
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--kk-muted)" }}>
          © 2026 · Mali & UEMOA
        </p>
        <p className="text-xs" style={{ color: "var(--kk-faint)" }}>
          En cas d&apos;urgence psychologique, composez le{" "}
          <strong style={{ color: "var(--kk-dark)" }}>15</strong> ou rendez-vous aux urgences les plus proches.
        </p>
      </footer>
    </div>
  );
}
