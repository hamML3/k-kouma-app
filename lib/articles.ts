export type Article = {
  slug: string;
  number: string;
  title: string;
  seoTitle: string;
  hook: string;
  intro: string[];
  symptomsIntro: string;
  symptoms: string[];
  example: string;
  exampleNote?: string;
  retenirTitle: string;
  retenirBody: string[];
  aideBody: string[];
  sources: { label: string; url: string }[];
  image: string;
  /** Mots-clés d'onboarding (motifs) associés — sert aux recommandations personnalisées. */
  motifs: string[];
};

const OMS_URL = "https://www.who.int/fr/news-room/fact-sheets";
const CDC_URL = "https://www.cdc.gov/ncbddd/adhd/facts.html";

export const ARTICLES: Article[] = [
  {
    slug: "depression",
    number: "01",
    title: "Qu'est-ce que la dépression ?",
    seoTitle: "Qu'est-ce que la dépression ? Symptômes, compréhension et accompagnement",
    hook: "Et si la dépression était bien plus que « se sentir triste » ?",
    intro: [
      "Il nous arrive à tous de traverser des périodes difficiles, d'être tristes ou de manquer d'énergie. Mais la dépression est différente d'un simple moment de tristesse.",
      "La dépression est un trouble de santé mentale qui peut se manifester par une humeur dépressive persistante ou par une perte durable d'intérêt ou de plaisir pour des activités que l'on appréciait auparavant. Elle peut également affecter le sommeil, l'appétit, l'énergie, la concentration et l'estime de soi.",
    ],
    symptomsIntro: "Une personne qui traverse une dépression peut notamment ressentir :",
    symptoms: [
      "une tristesse ou un sentiment de vide persistant",
      "une perte d'intérêt ou de plaisir",
      "une grande fatigue",
      "des difficultés à se concentrer",
      "des changements dans le sommeil ou l'appétit",
      "un sentiment de culpabilité ou de dévalorisation",
      "un sentiment de désespoir",
    ],
    example:
      "« Je sais que je devrais répondre à mes messages et sortir un peu, mais tout me demande énormément d'effort. Même les choses que j'aimais avant ne me font plus vraiment plaisir. »",
    exampleNote:
      "Ce n'est pas nécessairement de la paresse ou un manque de volonté. Lorsqu'une personne traverse une dépression, son énergie et son intérêt pour les activités peuvent réellement être affectés.",
    retenirTitle: "Être triste n'est pas forcément être dépressif.",
    retenirBody: [
      "Un épisode dépressif implique généralement des symptômes persistants qui ont un impact sur le fonctionnement quotidien. L'OMS indique notamment qu'un épisode dépressif se caractérise par des symptômes présents la majeure partie de la journée, presque tous les jours, pendant au moins deux semaines.",
    ],
    aideBody: [
      "Si ce que vous ressentez dure, s'intensifie ou commence à prendre une place importante dans votre quotidien, en parler à un professionnel de santé peut être une première étape.",
      "La dépression se soigne et des traitements efficaces existent.",
    ],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/depression.jpg",
    motifs: ["humeur", "deuil"],
  },
  {
    slug: "anxiete",
    number: "02",
    title: "Qu'est-ce que l'anxiété ?",
    seoTitle: "Qu'est-ce que l'anxiété ? Comprendre les troubles anxieux",
    hook: "L'anxiété fait partie de la vie. Mais quand devient-elle trop présente ?",
    intro: [
      "Avant un examen, un entretien ou une situation importante, il est normal de ressentir de l'appréhension. L'anxiété peut même nous aider à nous préparer à une situation perçue comme difficile.",
      "Mais lorsqu'elle devient fréquente, intense, difficile à contrôler et qu'elle commence à perturber la vie quotidienne, elle peut correspondre à un trouble anxieux.",
    ],
    symptomsIntro: "L'anxiété peut toucher à la fois l'esprit et le corps. Elle peut notamment provoquer :",
    symptoms: [
      "des inquiétudes persistantes",
      "des difficultés à se concentrer ou à prendre des décisions",
      "de l'agitation ou de l'irritabilité",
      "des tensions physiques",
      "des palpitations",
      "des nausées ou douleurs abdominales",
      "des difficultés à dormir",
      "une sensation de danger imminent",
    ],
    example:
      "« Mon rendez-vous est dans trois jours, mais j'y pense déjà constamment. J'imagine tout ce qui pourrait mal se passer et j'ai du mal à dormir. »",
    exampleNote:
      "Avoir une inquiétude ponctuelle ne signifie pas nécessairement avoir un trouble anxieux. Ce qui compte notamment, c'est la fréquence, l'intensité, la durée et l'impact sur la vie quotidienne.",
    retenirTitle: "L'anxiété n'est pas « juste dans la tête ».",
    retenirBody: [
      "Elle peut avoir des manifestations physiques bien réelles.",
      "Et surtout, demander de l'aide ne signifie pas que vous êtes incapable de gérer votre vie.",
    ],
    aideBody: [
      "Lorsque l'inquiétude devient difficile à contrôler, vous pousse à éviter certaines situations ou interfère avec votre vie personnelle, sociale, scolaire ou professionnelle, un professionnel de santé peut vous aider à comprendre ce qui se passe.",
      "Des traitements efficaces existent pour les troubles anxieux.",
    ],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/anxiete.jpg",
    motifs: ["anxiete"],
  },
  {
    slug: "tdah",
    number: "03",
    title: "Qu'est-ce que le TDAH ?",
    seoTitle: "Qu'est-ce que le TDAH ? Symptômes et fonctionnement",
    hook: "Le TDAH ne se résume pas à « être distrait ».",
    intro: [
      "Le trouble du déficit de l'attention avec ou sans hyperactivité (TDAH) est un trouble neurodéveloppemental. Il peut notamment se manifester par des difficultés persistantes d'attention, d'organisation, d'impulsivité et/ou d'hyperactivité.",
      "Le TDAH peut se présenter de différentes façons. Certaines personnes rencontrent surtout des difficultés d'attention et d'organisation, d'autres davantage d'hyperactivité et d'impulsivité, tandis que certaines présentent une combinaison des deux.",
    ],
    symptomsIntro: "Une personne avec un TDAH peut, par exemple :",
    symptoms: [
      "avoir du mal à organiser ou terminer une tâche",
      "être facilement distraite",
      "oublier certaines choses du quotidien",
      "perdre régulièrement des objets",
      "avoir du mal à suivre des instructions",
      "ressentir une agitation ou une difficulté à rester immobile",
      "agir ou parler de manière impulsive",
    ],
    example:
      "« Je sais exactement ce que je dois faire. J'y pense toute la journée. Pourtant, impossible de commencer. Puis, quand je m'y mets enfin, je peux être complètement absorbé par la tâche. »",
    exampleNote:
      "Les difficultés liées au TDAH peuvent être particulièrement frustrantes parce qu'elles ne correspondent pas forcément à un manque de motivation ou d'intelligence.",
    retenirTitle: "Être distrait, procrastiner ou oublier des choses ne suffit pas à conclure à un TDAH.",
    retenirBody: [
      "Le diagnostic repose sur une évaluation professionnelle et prend notamment en compte les symptômes, leur persistance et leur impact dans différents domaines de la vie. D'autres situations, comme les troubles du sommeil, l'anxiété ou la dépression, peuvent également provoquer certaines difficultés similaires.",
    ],
    aideBody: [
      "Si ces difficultés sont persistantes et vous empêchent de fonctionner comme vous le souhaitez au quotidien, parlez-en à un professionnel de santé.",
    ],
    sources: [
      { label: "Centers for Disease Control and Prevention (CDC)", url: CDC_URL },
      { label: "Organisation mondiale de la Santé", url: OMS_URL },
    ],
    image: "/articles/tdah.jpg",
    motifs: ["confiance"],
  },
  {
    slug: "autisme",
    number: "04",
    title: "Qu'est-ce que l'autisme ?",
    seoTitle: "Qu'est-ce que l'autisme ? Comprendre le trouble du spectre de l'autisme",
    hook: "Il n'existe pas une seule façon d'être autiste.",
    intro: [
      "L'autisme, ou trouble du spectre de l'autisme (TSA), regroupe différentes situations liées au développement du cerveau.",
      "Il peut notamment influencer la communication et les interactions sociales, mais aussi la manière dont une personne vit certaines sensations, s'adapte aux changements ou développe certains centres d'intérêt.",
      "Le terme « spectre » est important : les capacités, les besoins et les expériences des personnes autistes peuvent être très différents d'une personne à l'autre.",
    ],
    symptomsIntro: "Certaines personnes peuvent notamment :",
    symptoms: [
      "avoir besoin de routines",
      "trouver certains changements difficiles",
      "être particulièrement sensibles à certains sons, textures, lumières ou autres sensations",
      "avoir une manière différente de communiquer",
      "développer des intérêts très approfondis pour certains sujets",
    ],
    example:
      "Une personne peut trouver certains environnements très bruyants épuisants et avoir besoin de temps seule après une journée particulièrement stimulante. Pour une autre personne autiste, l'expérience peut être complètement différente.",
    retenirTitle: "Il n'existe pas de « look » de l'autisme.",
    retenirBody: [
      "Une personne peut être autonome, travailler, étudier, avoir une famille et avoir pourtant besoin d'aménagements ou de soutien dans certains aspects de sa vie.",
    ],
    aideBody: [
      "Si vous vous posez des questions sur votre propre fonctionnement ou celui d'un proche, évitez de vous fier uniquement à des listes trouvées en ligne. Une évaluation professionnelle permet de mieux comprendre la situation et les besoins de la personne.",
    ],
    sources: [{ label: "Organisation mondiale de la Santé", url: OMS_URL }],
    image: "/articles/autisme.jpg",
    motifs: ["confiance", "relations"],
  },
  {
    slug: "stress",
    number: "05",
    title: "Qu'est-ce que le stress ?",
    seoTitle: "Qu'est-ce que le stress ? Symptômes et effets sur le corps",
    hook: "Le stress n'est pas toujours notre ennemi.",
    intro: [
      "Le stress est une réaction naturelle face à une situation difficile ou exigeante. Un certain niveau de stress peut nous aider à relever un défi ou réagir face à une menace.",
      "Le problème apparaît lorsque le stress devient trop important ou persiste pendant longtemps.",
    ],
    symptomsIntro: "Il peut notamment être associé à :",
    symptoms: [
      "des difficultés à se détendre",
      "de l'irritabilité ou de l'anxiété",
      "des difficultés à se concentrer",
      "des maux de tête",
      "des douleurs corporelles",
      "des problèmes digestifs",
      "des troubles du sommeil",
      "des changements d'appétit",
    ],
    example:
      "« J'ai tellement de choses à gérer que même lorsque je suis enfin au repos, j'ai l'impression que mon cerveau continue de courir. »",
    exampleNote: "Le stress peut donc se manifester aussi bien mentalement que physiquement.",
    retenirTitle: "Être stressé de temps en temps est humain.",
    retenirBody: [
      "Ce qui mérite davantage d'attention, c'est un stress qui devient persistant et commence à affecter votre fonctionnement ou votre bien-être.",
    ],
    aideBody: [
      "Si vous avez l'impression d'être constamment dépassé, que votre sommeil, votre travail, vos relations ou votre santé sont affectés, parler à un professionnel peut vous aider.",
    ],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/stress.jpg",
    motifs: ["anxiete", "sommeil"],
  },
  {
    slug: "attaque-panique",
    number: "06",
    title: "Qu'est-ce qu'une attaque de panique ?",
    seoTitle: "Qu'est-ce qu'une attaque de panique ? Symptômes et compréhension",
    hook: "Quand une vague de peur semble arriver de nulle part.",
    intro: [
      "Une attaque de panique correspond à un épisode soudain de peur ou de malaise intense. Elle peut s'accompagner de manifestations physiques très impressionnantes, comme des palpitations, des tremblements, des nausées, des étourdissements ou une sensation de danger imminent.",
    ],
    symptomsIntro: "Pendant une attaque, une personne peut avoir l'impression :",
    symptoms: [
      "que son cœur bat très vite",
      "qu'elle manque d'air",
      "qu'elle va perdre le contrôle",
      "qu'elle va s'évanouir",
      "que quelque chose de grave est sur le point d'arriver",
    ],
    example:
      "« Tout allait bien et, soudainement, mon cœur s'est mis à battre très fort. Je tremblais et j'avais l'impression que quelque chose de terrible allait arriver. »",
    exampleNote: "Ce type d'expérience peut être extrêmement effrayant.",
    retenirTitle: "Une attaque de panique n'est pas la même chose qu'un trouble panique.",
    retenirBody: [
      "Certaines personnes peuvent vivre une attaque ponctuelle. Lorsque les attaques se répètent et entraînent notamment une peur persistante d'en avoir une autre ou des changements importants dans le comportement, il peut s'agir d'un trouble panique.",
    ],
    aideBody: [
      "Si ces épisodes se répètent ou vous poussent à éviter certaines situations, parlez-en à un professionnel de santé.",
      "Et lorsqu'un épisode comporte des symptômes physiques inhabituels ou inquiétants, il est important de ne pas automatiquement supposer qu'il s'agit d'une attaque de panique : certaines manifestations peuvent avoir d'autres causes médicales.",
    ],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/attaque-panique.jpg",
    motifs: ["anxiete", "traumatisme"],
  },
  {
    slug: "bipolaire",
    number: "07",
    title: "Qu'est-ce que le trouble bipolaire ?",
    seoTitle: "Qu'est-ce que le trouble bipolaire ? Comprendre les épisodes maniaques et dépressifs",
    hook: "Le trouble bipolaire n'est pas simplement « avoir des sautes d'humeur ».",
    intro: [
      "Le trouble bipolaire est un problème de santé mentale qui affecte notamment l'humeur, l'énergie, l'activité et les pensées. Il se caractérise par des épisodes maniaques ou hypomaniaques et des épisodes dépressifs.",
    ],
    symptomsIntro: "Pendant un épisode maniaque, une personne peut notamment avoir :",
    symptoms: [
      "beaucoup plus d'énergie que d'habitude",
      "un besoin de sommeil fortement diminué",
      "une pensée ou une parole très rapide",
      "une estime de soi inhabituellement élevée",
      "une plus grande impulsivité",
      "des comportements pouvant comporter des risques",
    ],
    example: "« Aujourd'hui je suis très heureuse et demain je suis triste. »",
    exampleNote:
      "Ce n'est donc pas simplement ça : les épisodes du trouble bipolaire sont plus marqués et peuvent avoir des conséquences importantes sur la vie quotidienne. Pendant un épisode dépressif, la personne peut au contraire ressentir une grande tristesse ou un vide, perdre intérêt pour ses activités, être très fatiguée ou avoir des difficultés à se concentrer.",
    retenirTitle: "Les changements d'humeur ordinaires ne signifient pas automatiquement qu'une personne est bipolaire.",
    retenirBody: [
      "Seul un professionnel peut déterminer si les symptômes correspondent à un trouble bipolaire.",
    ],
    aideBody: [
      "Si des changements importants d'humeur, d'énergie, de sommeil ou de comportement se répètent et ont des conséquences sur votre vie, un professionnel de santé peut vous aider à comprendre ce qui se passe.",
      "Des traitements et accompagnements efficaces existent, et les personnes concernées peuvent mener une vie riche et épanouissante avec une prise en charge adaptée.",
    ],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/bipolaire.jpg",
    motifs: ["humeur"],
  },
  {
    slug: "sante-mentale",
    number: "08",
    title: "Qu'est-ce que la santé mentale ?",
    seoTitle: "Qu'est-ce que la santé mentale ? Pourquoi est-elle importante ?",
    hook: "La santé mentale fait partie de notre santé tout court.",
    intro: [
      "La santé mentale correspond à un état de bien-être qui nous permet notamment de faire face aux difficultés de la vie, d'apprendre, de travailler, d'entretenir des relations et de participer à la vie de notre communauté.",
      "Elle ne signifie pas être heureux tout le temps. Nous pouvons tous traverser des périodes de stress, de tristesse, de doute ou de fatigue. Notre santé mentale peut évoluer au cours de notre vie et être influencée par de nombreux facteurs personnels, familiaux, sociaux et environnementaux.",
    ],
    symptomsIntro: "Prendre soin de sa santé mentale — il n'existe pas une seule façon de prendre soin de soi. Cela peut notamment passer par :",
    symptoms: [
      "maintenir des relations qui nous font du bien",
      "prendre suffisamment de repos",
      "bouger régulièrement",
      "prendre du temps pour soi",
      "reconnaître ses limites",
      "parler de ce que l'on ressent",
      "demander de l'aide lorsque cela devient nécessaire",
    ],
    example:
      "Ces habitudes ne remplacent pas un traitement lorsqu'un trouble de santé mentale est présent, mais elles peuvent contribuer au bien-être général.",
    retenirTitle: "Demander de l'aide n'est pas un échec.",
    retenirBody: [
      "Prendre soin de sa santé mentale mérite la même attention que prendre soin de sa santé physique.",
      "Et si vous commenciez simplement par vous écouter ? Vous n'avez pas besoin d'attendre d'être « au bout » pour parler à quelqu'un.",
    ],
    aideBody: [],
    sources: [{ label: "Organisation Mondiale de la Santé", url: OMS_URL }],
    image: "/articles/sante-mentale.jpg",
    motifs: [],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Articles recommandés pour un patient selon les motifs cochés à l'onboarding. */
export function recommendedArticles(motifs: string[] | undefined, limit = 3): Article[] {
  if (!motifs || motifs.length === 0) return ARTICLES.slice(0, limit);

  const scored = ARTICLES.map((a) => ({
    article: a,
    score: a.motifs.filter((m) => motifs.includes(m)).length,
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.score > 0).map((s) => s.article);
  if (top.length >= limit) return top.slice(0, limit);

  const rest = ARTICLES.filter((a) => !top.includes(a));
  return [...top, ...rest].slice(0, limit);
}
