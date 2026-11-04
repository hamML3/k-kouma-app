// Matching engine — scores a therapist against a patient's onboarding answers

export type OnboardingAnswers = {
  therapyType?: string;
  motifs?: string[];
  mood?: string;
  duration?: string;
  previousTherapy?: string;
  safety?: string;
  langue?: string;
  mode?: string;
  therapistGender?: string;
};

export type TherapistForMatching = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  specialties: string | null;
  bio: string | null;
  languages: string | null;
};

export type MatchResult = {
  score: number;       // raw score (0–100+)
  pct: number;         // clamped percentage shown to user (0–100)
  reasons: string[];   // human-readable match explanations
};

// ── Maps ──────────────────────────────────────────────────────────────────────

// Patient motif key → keywords to look for in therapist specialties (lowercase)
const MOTIF_KEYWORDS: Record<string, string[]> = {
  anxiete:    ["anxiété", "stress", "anxiety", "anxiete"],
  humeur:     ["dépression", "depression", "humeur", "tristesse"],
  relations:  ["relation", "couple", "famille", "social"],
  sommeil:    ["sommeil", "insomnie", "sleep"],
  confiance:  ["confiance", "développement", "estime", "personnel"],
  traumatisme:["traumatisme", "ptsd", "trauma", "choc"],
  deuil:      ["deuil", "perte", "douleur", "grief"],
  autre:      [],
};

// Patient motif key → French label for the "reason" tag
const MOTIF_LABELS: Record<string, string> = {
  anxiete:     "Anxiété / stress",
  humeur:      "Dépression / humeur",
  relations:   "Relations",
  sommeil:     "Troubles du sommeil",
  confiance:   "Confiance en soi",
  traumatisme: "Traumatisme",
  deuil:       "Deuil / perte",
};

// Therapy type → specialty keywords
const THERAPY_TYPE_KEYWORDS: Record<string, string[]> = {
  couple: ["couple", "relation", "mariage", "partenaire"],
  enfant: ["enfant", "adolescent", "ado", "enfance", "jeune"],
  individuelle: [],
};

// Patient language key → substrings to match in therapist.languages
const LANGUE_KEYS: Record<string, string> = {
  francais: "français",
  bambara:  "bambara",
  peulh:    "peulh",
  malinke:  "malinké",
  sorai:    "soraï",
};

// ── Scoring ───────────────────────────────────────────────────────────────────

const WEIGHT = {
  language:    40,  // speaking patient's language
  motif:       15,  // each matching motif (max 3 = 45)
  therapyType: 15,  // therapy type match
  bio:          5,  // has written a bio
} as const;

const NORMALISE_AGAINST = 85; // what a "perfect match" looks like in raw points

export function scoreTherapist(
  answers: OnboardingAnswers,
  therapist: TherapistForMatching
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const specialtiesLower = (therapist.specialties ?? "").toLowerCase();
  const languagesLower   = (therapist.languages ?? "").toLowerCase();

  // ── Language match ─────────────────────────────────────────────────────────
  const patientLangue = answers.langue ?? "";
  if (patientLangue && patientLangue !== "peuimporte") {
    const needle = LANGUE_KEYS[patientLangue];
    if (needle && languagesLower.includes(needle)) {
      score += WEIGHT.language;
      const capLabel = needle.charAt(0).toUpperCase() + needle.slice(1);
      reasons.push(`Parle ${capLabel}`);
    }
  } else if (patientLangue === "peuimporte" || !patientLangue) {
    // Partial credit — any language is fine, reward if therapist is multilingual
    const langCount = (therapist.languages ?? "").split(",").filter(Boolean).length;
    if (langCount >= 2) {
      score += 15;
      reasons.push("Multilingue");
    }
  }

  // ── Motif matching ─────────────────────────────────────────────────────────
  const motifs = answers.motifs ?? [];
  let motifHits = 0;
  for (const motif of motifs) {
    if (motifHits >= 3) break; // cap at 3 motifs
    const keywords = MOTIF_KEYWORDS[motif] ?? [];
    const hit = keywords.some((kw) => specialtiesLower.includes(kw));
    if (hit) {
      score += WEIGHT.motif;
      motifHits++;
      if (MOTIF_LABELS[motif]) reasons.push(MOTIF_LABELS[motif]);
    }
  }

  // ── Therapy type match ─────────────────────────────────────────────────────
  const therapyType = answers.therapyType ?? "";
  if (therapyType && therapyType !== "individuelle") {
    const keywords = THERAPY_TYPE_KEYWORDS[therapyType] ?? [];
    if (keywords.some((kw) => specialtiesLower.includes(kw))) {
      score += WEIGHT.therapyType;
      if (therapyType === "couple")  reasons.push("Thérapie de couple");
      if (therapyType === "enfant")  reasons.push("Enfants / Adolescents");
    }
  }

  // ── Safety urgency boost ───────────────────────────────────────────────────
  // If patient is at risk, prioritise therapists with trauma/urgent specialties
  if (answers.safety === "oui" || answers.safety === "parfois") {
    const urgentKw = ["traumatisme", "urgence", "crise", "ptsd", "deuil"];
    if (urgentKw.some((kw) => specialtiesLower.includes(kw))) {
      score += 10;
      reasons.push("Spécialisé soutien de crise");
    }
  }

  // ── Profile completeness ───────────────────────────────────────────────────
  if (therapist.bio && therapist.bio.length > 50) score += WEIGHT.bio;

  const pct = Math.min(100, Math.round((score / NORMALISE_AGAINST) * 100));

  return { score, pct, reasons };
}

// Returns a label + color for the match percentage
export function matchBadge(pct: number): { label: string; bg: string; color: string } {
  if (pct >= 80) return { label: `${pct}% compatible`,  bg: "var(--kk-green-light)",  color: "var(--kk-green)" };
  if (pct >= 50) return { label: `${pct}% compatible`,  bg: "var(--kk-purple-light)", color: "var(--kk-purple)" };
  if (pct >= 20) return { label: `${pct}% compatible`,  bg: "var(--kk-gold-light)",   color: "var(--kk-gold)" };
  return            { label: "Profil général",           bg: "var(--kk-border)",        color: "var(--kk-muted)" };
}
