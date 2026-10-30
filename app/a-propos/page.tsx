import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = { title: "À propos — K-Kouma" };

const MISSION_ITEMS = [
  "trouver un psychologue ou un professionnel adapté à ses besoins ;",
  "prendre rendez-vous facilement ;",
  "bénéficier de consultations individuelles ;",
  "accéder à des consultations de couple ou adaptées aux adolescents ;",
  "utiliser des questionnaires et outils d'orientation pour mieux comprendre ce que l'on ressent ;",
  "accéder à des ressources éducatives sur la santé mentale ;",
  "construire progressivement son parcours d'accompagnement.",
];

const AMBITION_ITEMS = [
  "🧠 des consultations psychologiques ;",
  "👩🏽‍⚕️ un réseau de professionnels de santé mentale ;",
  "💻 des téléconsultations ;",
  "📝 des questionnaires et outils d'orientation ;",
  "📚 des ressources éducatives ;",
  "👨‍👩‍👧 des ressources pour les parents et les familles ;",
  "🧑🏽‍🎓 des programmes dédiés aux étudiants et aux jeunes ;",
  "💼 des programmes de santé mentale en entreprise ;",
  "🫂 des groupes de parole ;",
  "💑 un accompagnement pour les couples ;",
  "🧒 des ressources adaptées aux adolescents ;",
  "🏥 une orientation vers d'autres professionnels de santé lorsque cela est nécessaire ;",
  "🎓 des initiatives de sensibilisation et de formation ;",
  "📊 des données anonymisées permettant de mieux comprendre les besoins en santé mentale.",
];

const ET_SI = [
  "Et si vous pouviez parler sans avoir peur d'être jugé ?",
  "Et si demander de l'aide devenait normal ?",
  "Et si prendre soin de votre santé mentale faisait partie de votre quotidien ?",
  "Et si le premier pas était simplement de parler ?",
];

const STARTERS = [
  "Je ne sais pas vraiment ce que je ressens.",
  "Je traverse une période difficile.",
  "J'ai besoin de parler.",
  "Je cherche un professionnel.",
  "Je veux simplement mieux me comprendre.",
];

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-12 border-t" style={{ borderColor: "var(--kk-border)" }}>
      <h2
        className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2.5"
        style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
      >
        <span aria-hidden>{emoji}</span> {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <PublicNav />
      <main style={{ background: "var(--kk-bg)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          {/* Hero */}
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-green)" }}>
            À propos de K-Kouma
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Parce que parfois, il suffit de pouvoir parler.
          </h1>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
            <p>
              K-Kouma est une plateforme de santé mentale pensée pour rendre l&apos;accompagnement psychologique plus
              accessible, plus simple, plus humain et plus proche des réalités de nos communautés.
            </p>
            <p>
              Le nom <strong style={{ color: "var(--kk-dark)" }}>K-Kouma</strong> vient de <em>kuma</em>, qui signifie
              « parler » en Bambara.
            </p>
            <p>
              Parce qu&apos;avant même de chercher une solution, il faut parfois simplement pouvoir dire ce que l&apos;on
              ressent. Et parfois, parler est déjà un commencement.
            </p>
          </div>

          <Section emoji="🌱" title="Notre raison d'être">
            <p>
              Nous croyons qu&apos;il ne devrait pas être nécessaire d&apos;attendre d&apos;être au bord de l&apos;épuisement
              pour demander de l&apos;aide.
            </p>
            <p>
              Anxiété, stress, difficultés relationnelles, solitude, deuil, épuisement, difficultés familiales,
              adolescence, couple, questionnements personnels ou simplement besoin de comprendre ce que l&apos;on
              ressent… Chaque histoire mérite d&apos;être écoutée.
            </p>
            <p>
              K-Kouma crée un espace dans lequel chacun peut chercher de l&apos;aide, trouver un professionnel adapté
              et avancer à son propre rythme, dans un environnement fondé sur la confidentialité, le respect et
              l&apos;absence de jugement.
            </p>
          </Section>

          <Section emoji="🧠" title="Notre mission">
            <p>Notre mission est de contribuer à rendre la santé mentale plus accessible et plus naturelle dans notre société.</p>
            <p>
              K-Kouma rapproche les personnes de professionnels de santé mentale qualifiés grâce à une plateforme
              simple et adaptée à leur quotidien. La plateforme permet notamment de :
            </p>
            <ul className="space-y-1.5">
              {MISSION_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-green)" }} />
                  {item}
                </li>
              ))}
            </ul>
            <p>
              K-Kouma n&apos;a pas vocation à remplacer les professionnels de santé. Elle a vocation à rendre leur
              accompagnement plus accessible.
            </p>
          </Section>

          <Section emoji="🌍" title="Une plateforme pensée pour l'Afrique">
            <p>
              Les besoins en santé mentale existent partout. Pourtant, l&apos;accès à un accompagnement psychologique
              reste encore difficile pour de nombreuses personnes, notamment en raison du manque de professionnels,
              de la distance, du coût, du manque d&apos;information ou encore de la stigmatisation.
            </p>
            <p>K-Kouma souhaite contribuer à réduire ces barrières.</p>
            <p>
              Nous voulons construire une plateforme pensée pour les réalités africaines, tout en respectant la
              diversité des cultures, des langues, des familles, des générations et des parcours individuels.
            </p>
            <p>
              Notre ambition est de contribuer à faire de la santé mentale une composante normale et accessible de
              la santé globale.
            </p>
          </Section>

          <Section emoji="🫂" title="Notre philosophie">
            <p>Nous ne cherchons pas à réparer les personnes. Une personne n&apos;est pas une machine défectueuse qu&apos;il faudrait réparer.</p>
            <p>
              Nous croyons qu&apos;une personne peut simplement avoir besoin d&apos;un espace pour comprendre ce
              qu&apos;elle traverse, mettre des mots sur ce qu&apos;elle ressent et être accompagnée dans son
              cheminement.
            </p>
            <p className="kk-card p-5">
              <strong style={{ color: "var(--kk-dark)" }}>Chez K-Kouma, nous ne cherchons pas à changer qui vous êtes.</strong>
              <br />
              Nous vous aidons à mieux vous comprendre.
            </p>
          </Section>

          <Section emoji="🤍" title="Ce que K-Kouma n'est pas">
            <p>K-Kouma n&apos;est pas là pour vous dire comment vivre votre vie.</p>
            <p>
              Nous ne sommes pas là pour juger vos choix, vous donner des réponses toutes faites ou vous dire ce que
              vous devriez ressentir.
            </p>
            <p>Nous sommes là pour vous aider à comprendre, à parler et à avancer.</p>
            <p>
              Parce que demander de l&apos;aide n&apos;est pas une faiblesse. C&apos;est parfois simplement reconnaître
              que l&apos;on mérite de ne pas tout porter seul.
            </p>
          </Section>

          <Section emoji="🔐" title="Votre intimité compte">
            <p>La santé mentale est intime.</p>
            <p>
              Chez K-Kouma, nous accordons donc une importance particulière à la confidentialité, au respect de la
              personne et à l&apos;absence de jugement.
            </p>
            <p>
              Chaque utilisateur doit pouvoir trouver un espace où il peut parler librement, à son rythme et dans le
              respect de son histoire.
            </p>
          </Section>

          <section className="py-12 border-t text-center" style={{ borderColor: "var(--kk-border)" }}>
            <h2 className="text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              🪞 Et si… ?
            </h2>
            <div className="space-y-3">
              {ET_SI.map((q) => (
                <p key={q} className="text-base" style={{ color: "var(--kk-mid)", fontFamily: "var(--font-lora)" }}>
                  {q}
                </p>
              ))}
            </div>
            <p className="text-sm font-semibold mt-6" style={{ color: "var(--kk-dark)" }}>
              C&apos;est pour cela que K-Kouma existe.
            </p>
          </section>

          <Section emoji="💬" title="Pourquoi K-Kouma ?">
            <p>Parce que <em>kuma</em>, c&apos;est parler.</p>
            <p>Parce que certaines choses sont difficiles à dire à son entourage.</p>
            <p>
              Parce que parfois, on ne cherche même pas encore une solution : on cherche simplement quelqu&apos;un qui
              puisse nous écouter.
            </p>
            <p>Parce que comprendre ce que l&apos;on ressent peut être le début d&apos;un changement.</p>
            <p>Parce que la santé mentale mérite autant d&apos;attention que la santé physique.</p>
            <p className="font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              K-Kouma — Parler. Être écouté. Avancer.
            </p>
          </Section>

          <Section emoji="🌿" title="Notre vision">
            <p>Nous imaginons une société dans laquelle dire : « Je ne vais pas bien. » ne provoque ni honte, ni jugement, ni silence.</p>
            <p>Une société dans laquelle consulter un psychologue est aussi naturel que consulter un médecin.</p>
            <p>
              Une société dans laquelle les enfants, les adolescents, les adultes, les couples, les familles et les
              professionnels peuvent trouver les ressources dont ils ont besoin pour prendre soin de leur santé
              mentale.
            </p>
            <p>Nous voulons contribuer à créer cette nouvelle culture : plus ouverte, plus humaine et plus accessible.</p>
          </Section>

          <Section emoji="🌍" title="Notre ambition">
            <p>K-Kouma ne veut pas être simplement une plateforme permettant de prendre rendez-vous avec un psychologue.</p>
            <p>Notre ambition est de construire progressivement un véritable écosystème de santé mentale en Afrique de l&apos;Ouest.</p>
            <p>À terme, K-Kouma pourra réunir :</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {AMBITION_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="font-semibold" style={{ color: "var(--kk-dark)" }}>
              Notre objectif : faire de K-Kouma une véritable porte d&apos;entrée vers la santé mentale.
            </p>
          </Section>

          <Section emoji="💛" title="Notre promesse">
            <p>Nous ne promettons pas de résoudre tous les problèmes.</p>
            <p>Nous promettons quelque chose de plus simple : vous aider à ne plus avoir à les porter seul.</p>
            <p>Parce que chaque parcours est différent. Chaque histoire est différente. Chaque personne avance à son propre rythme.</p>
            <p>Et chez K-Kouma, il n&apos;y a pas de honte à commencer petit. Parfois, le premier pas est simplement de parler.</p>
          </Section>

          {/* CTA */}
          <section className="py-12 border-t" style={{ borderColor: "var(--kk-border)" }}>
            <div className="rounded-3xl p-8 text-center" style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}>
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                🪴 Commencez ici
              </h2>
              <p className="text-sm mb-1" style={{ color: "var(--kk-mid)" }}>
                Qu&apos;est-ce que vous aimeriez pouvoir dire aujourd&apos;hui ?
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--kk-mid)" }}>
                Vous pouvez commencer ici. Sans jugement. Sans pression. À votre rythme.
              </p>

              <div className="space-y-2 max-w-md mx-auto mb-7">
                {STARTERS.map((s) => (
                  <p
                    key={s}
                    className="text-sm rounded-xl py-2.5 px-4"
                    style={{ background: "#fff", color: "var(--kk-dark)", border: "1px solid #EDE8DC" }}
                  >
                    {s}
                  </p>
                ))}
              </div>

              <Link href="/register" className="kk-btn-purple inline-block px-8">
                Commencer →
              </Link>
            </div>

            <p
              className="text-center font-bold mt-10"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              K-KOUMA — Parler. Être écouté. Avancer.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
