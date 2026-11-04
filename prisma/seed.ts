/**
 * K-Kouman — Seed script
 * Usage : npx prisma db seed
 *
 * Crée un jeu de données de test complet :
 *  - 1 compte admin
 *  - 1 compte modérateur (accès admin restreint)
 *  - 6 thérapeutes (5 vérifiés + 1 en attente de vérification)
 *  - 4 patients (onboarding complété, profils variés)
 *  - Des assignations patient ↔ thérapeute
 *  - Des rendez-vous à différents stades (en attente, confirmé, terminé) et types (vidéo, audio, messagerie)
 *  - Une conversation de test sur le rendez-vous de messagerie
 *  - Un abonnement actif pour un patient
 */

import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { LEGACY_MODERATOR_PERMISSIONS } from "../lib/permissions";

const prisma = new PrismaClient();

const PASSWORD_ADMIN = "Admin@KKouma2026!";
const PASSWORD_MODERATOR = "Moderator@2026!";
const PASSWORD_THERAPIST = "Therapist@2026!";
const PASSWORD_PATIENT = "Patient@2026!";

type TherapistSeed = {
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  specialties: string;
  languages: string;
  isVerified: boolean;
};

type PatientSeed = {
  email: string;
  nickname: string;
  timezone: string;
  onboardingAnswers: Prisma.InputJsonValue;
};

const THERAPISTS: TherapistSeed[] = [
  {
    email: "dr.aminata@k-kouma.com",
    firstName: "Aminata",
    lastName: "Coulibaly",
    bio: "Psychologue clinicienne avec 8 ans d'expérience, spécialisée dans la gestion de l'anxiété et des traumatismes. Formée aux réalités culturelles de l'Afrique de l'Ouest.",
    specialties: "Anxiété et stress,Traumatisme (PTSD)",
    languages: "Français,Bambara",
    isVerified: true,
  },
  {
    email: "dr.mamadou@k-kouma.com",
    firstName: "Mamadou",
    lastName: "Traoré",
    bio: "Psychologue clinicien spécialisé dans les troubles de l'humeur et la dépression, avec une approche intégrant les pratiques communautaires locales.",
    specialties: "Dépression,Développement personnel",
    languages: "Français,Bambara,Peulh",
    isVerified: true,
  },
  {
    email: "dr.nene@k-kouma.com",
    firstName: "Néné",
    lastName: "Koffi",
    bio: "Thérapeute de couple et de famille, accompagne les partenaires dans la communication et la résolution de conflits depuis plus de 10 ans.",
    specialties: "Relations et couple,Enfants et adolescents",
    languages: "Français,Malinké,Bambara",
    isVerified: true,
  },
  {
    email: "dr.idrissa@k-kouma.com",
    firstName: "Idrissa",
    lastName: "Koné",
    bio: "Psychologue pour enfants et adolescents, spécialisé dans l'accompagnement scolaire et les troubles du comportement.",
    specialties: "Enfants et adolescents",
    languages: "Français,Peulh,Malinké",
    isVerified: true,
  },
  {
    email: "dr.fatoumata@k-kouma.com",
    firstName: "Fatoumata",
    lastName: "Diarra",
    bio: "Psychologue clinicienne accompagnant le deuil, la perte et les transitions de vie, avec une approche douce et centrée sur la personne.",
    specialties: "Deuil et perte,Développement personnel",
    languages: "Français,Soraï",
    isVerified: true,
  },
  {
    email: "dr.oumar@k-kouma.com",
    firstName: "Oumar",
    lastName: "Sangaré",
    bio: "Psychologue clinicien spécialisé dans les addictions et la prévention des rechutes. Candidature en cours de vérification.",
    specialties: "Addictions,Anxiété et stress",
    languages: "Français,Bambara",
    isVerified: false,
  },
];

const PATIENTS: PatientSeed[] = [
  {
    email: "patient.test@k-kouma.com",
    nickname: "Seydou",
    timezone: "Africa/Bamako",
    onboardingAnswers: {
      motifs: ["anxiete", "sommeil"],
      languages: ["Français"],
      therapyType: "individuelle",
      budget: "15000",
      safety: false,
    },
  },
  {
    email: "aicha.patient@k-kouma.com",
    nickname: "Aïcha",
    timezone: "Africa/Bamako",
    onboardingAnswers: {
      motifs: ["relations", "confiance"],
      languages: ["Français", "Bambara"],
      therapyType: "couple",
      budget: "18000",
      safety: false,
    },
  },
  {
    email: "boubacar.patient@k-kouma.com",
    nickname: "Boubacar",
    timezone: "Africa/Bamako",
    onboardingAnswers: {
      motifs: ["traumatisme"],
      languages: ["Français", "Peulh"],
      therapyType: "enfant",
      budget: "10000",
      safety: false,
    },
  },
  {
    email: "mariam.patient@k-kouma.com",
    nickname: "Mariam",
    timezone: "Africa/Bamako",
    onboardingAnswers: {
      motifs: ["humeur", "deuil"],
      languages: ["Français"],
      therapyType: "individuelle",
      budget: "14000",
      safety: false,
    },
  },
];

async function seedAdmin() {
  const email = "admin@k-kouma.com";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("⏭️  Admin déjà existant →", email);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(PASSWORD_ADMIN, 12),
      role: "admin",
      status: "active",
    },
  });
  console.log("✅ Admin créé          →", email);
}

async function seedModerator() {
  const email = "moderateur@k-kouma.com";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("⏭️  Modérateur déjà existant →", email);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(PASSWORD_MODERATOR, 12),
      role: "moderator",
      status: "active",
      // Jeu de capacités historique du modérateur (finances + lecture,
      // cette dernière restant de toute façon ouverte à tout modérateur) —
      // voir lib/permissions.ts. Un admin peut ensuite accorder/retirer des
      // permissions individuellement depuis /admin/users.
      permissions: LEGACY_MODERATOR_PERMISSIONS,
    },
  });
  console.log("✅ Modérateur créé     →", email);
}

async function seedTherapist(t: TherapistSeed) {
  const exists = await prisma.user.findUnique({ where: { email: t.email } });
  if (exists) {
    console.log("⏭️  Thérapeute existant →", t.email);
    return exists.id;
  }
  const user = await prisma.user.create({
    data: {
      email: t.email,
      passwordHash: await bcrypt.hash(PASSWORD_THERAPIST, 12),
      role: "therapist",
      status: "active",
      therapistProfile: {
        create: {
          firstName: t.firstName,
          lastName: t.lastName,
          bio: t.bio,
          specialties: t.specialties,
          languages: t.languages,
          isVerified: t.isVerified,
          // Thérapeutes de démo déjà vérifiés : on les considère comme ayant
          // accepté la commission par défaut en vigueur, pour ne pas les
          // bloquer sur /conditions-commission dans les tests manuels.
          ...(t.isVerified && {
            commissionAcceptedPercent: 20,
            commissionAcceptedAt: new Date(),
          }),
        },
      },
    },
  });
  console.log(`✅ Thérapeute créé     → ${t.email} ${t.isVerified ? "" : "(en attente)"}`);
  return user.id;
}

async function seedPatient(p: PatientSeed) {
  const exists = await prisma.user.findUnique({ where: { email: p.email } });
  if (exists) {
    console.log("⏭️  Patient existant    →", p.email);
    return exists.id;
  }
  const user = await prisma.user.create({
    data: {
      email: p.email,
      passwordHash: await bcrypt.hash(PASSWORD_PATIENT, 12),
      role: "patient",
      status: "active",
      patientProfile: {
        create: {
          nickname: p.nickname,
          timezone: p.timezone,
          onboardingAnswers: p.onboardingAnswers,
        },
      },
    },
  });
  console.log("✅ Patient créé        →", p.email);
  return user.id;
}

async function seedAssignment(patientId: number, therapistId: number) {
  const exists = await prisma.patientTherapistAssignment.findFirst({
    where: { patientId, therapistId },
  });
  if (exists) return;
  await prisma.patientTherapistAssignment.create({
    data: { patientId, therapistId, status: "active" },
  });
}

async function seedAppointment(opts: {
  patientId: number;
  therapistId: number;
  scheduledAt: Date;
  durationMinutes?: number;
  status: "pending" | "confirmed" | "completed";
  type: "video" | "audio" | "text";
}) {
  const exists = await prisma.appointment.findFirst({
    where: {
      patientId: opts.patientId,
      therapistId: opts.therapistId,
      scheduledAt: opts.scheduledAt,
    },
  });
  if (exists) return exists;

  const needsRoom = opts.type !== "text" && opts.status !== "pending";
  return prisma.appointment.create({
    data: {
      patientId: opts.patientId,
      therapistId: opts.therapistId,
      scheduledAt: opts.scheduledAt,
      durationMinutes: opts.durationMinutes ?? 45,
      status: opts.status,
      type: opts.type,
      webrtcRoomId: needsRoom ? randomUUID() : null,
    },
  });
}

async function main() {
  console.log("🌱 Seeding K-Kouma...\n");

  await seedAdmin();
  await seedModerator();

  const therapistIds: Record<string, number> = {};
  for (const t of THERAPISTS) {
    therapistIds[t.email] = await seedTherapist(t);
  }

  const patientIds: Record<string, number> = {};
  for (const p of PATIENTS) {
    patientIds[p.email] = await seedPatient(p);
  }

  console.log("\n🔗 Assignations et rendez-vous...");

  const seydouId = patientIds["patient.test@k-kouma.com"];
  const aichaId = patientIds["aicha.patient@k-kouma.com"];
  const boubacarId = patientIds["boubacar.patient@k-kouma.com"];
  // Mariam volontairement sans thérapeute assigné : teste le parcours "trouver un psychologue".

  const aminataId = therapistIds["dr.aminata@k-kouma.com"];
  const neneId = therapistIds["dr.nene@k-kouma.com"];
  const idrissaId = therapistIds["dr.idrissa@k-kouma.com"];

  // Seydou ↔ Aminata : suivi individuel déjà en cours
  await seedAssignment(seydouId, aminataId);
  const now = Date.now();
  await seedAppointment({
    patientId: seydouId,
    therapistId: aminataId,
    scheduledAt: new Date(now - 7 * 24 * 60 * 60 * 1000), // il y a 1 semaine
    status: "completed",
    type: "video",
  });
  await seedAppointment({
    patientId: seydouId,
    therapistId: aminataId,
    scheduledAt: new Date(now + 2 * 24 * 60 * 60 * 1000), // dans 2 jours
    status: "confirmed",
    type: "video",
  });

  // Aïcha ↔ Néné : thérapie de couple, séance de messagerie confirmée avec historique
  await seedAssignment(aichaId, neneId);
  const chatAppointment = await seedAppointment({
    patientId: aichaId,
    therapistId: neneId,
    scheduledAt: new Date(now + 60 * 60 * 1000), // dans 1 heure — joignable
    status: "confirmed",
    type: "text",
  });
  if (chatAppointment) {
    const existingMessages = await prisma.message.count({
      where: { appointmentId: chatAppointment.id },
    });
    if (existingMessages === 0) {
      await prisma.message.createMany({
        data: [
          {
            appointmentId: chatAppointment.id,
            senderId: aichaId,
            body: "Bonjour docteur, merci de me recevoir. Mon mari et moi avons du mal à communiquer ces derniers temps.",
            createdAt: new Date(now - 10 * 60 * 1000),
          },
          {
            appointmentId: chatAppointment.id,
            senderId: neneId,
            body: "Bonjour Aïcha, je suis à votre écoute. Pouvez-vous me donner un exemple récent d'une situation qui vous a mise en difficulté ?",
            createdAt: new Date(now - 8 * 60 * 1000),
          },
          {
            appointmentId: chatAppointment.id,
            senderId: aichaId,
            body: "Hier soir, on s'est disputés parce qu'il ne m'écoute pas quand je parle de ma journée.",
            createdAt: new Date(now - 5 * 60 * 1000),
          },
        ],
      });
      console.log("✅ Conversation de test créée sur le rendez-vous messagerie (Aïcha ↔ Néné)");
    }
  }

  // Boubacar ↔ Idrissa : rendez-vous en attente de confirmation (teste le flux thérapeute)
  await seedAssignment(boubacarId, idrissaId);
  await seedAppointment({
    patientId: boubacarId,
    therapistId: idrissaId,
    scheduledAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    status: "pending",
    type: "audio",
  });

  console.log("\n💳 Abonnement...");
  const starterPlan =
    (await prisma.subscriptionPlan.findFirst({ where: { name: "Starter" } })) ??
    (await prisma.subscriptionPlan.create({
      data: { name: "Starter", price: 0, currency: "XOF", videoMinutesIncluded: 180, isActive: true },
    }));

  const existingSub = await prisma.patientSubscription.findUnique({ where: { patientId: seydouId } });
  if (!existingSub) {
    await prisma.patientSubscription.create({
      data: {
        patientId: seydouId,
        planId: starterPlan.id,
        status: "active",
        currentPeriodStart: new Date(now - 5 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(now + 25 * 24 * 60 * 60 * 1000),
        videoMinutesRemaining: 135,
      },
    });
    console.log("✅ Abonnement Starter actif → Seydou");
  }

  console.log("\n🎉 Seed terminé !\n");
  console.log("─────────────────────────────────────────────");
  console.log("  Admin        : admin@k-kouma.com /", PASSWORD_ADMIN);
  console.log("  Modérateur   : moderateur@k-kouma.com /", PASSWORD_MODERATOR);
  console.log("  Thérapeutes  : dr.aminata / dr.mamadou / dr.nene / dr.idrissa / dr.fatoumata");
  console.log("                 / dr.oumar (en attente) @k-kouma.com /", PASSWORD_THERAPIST);
  console.log("  Patients     : patient.test / aicha.patient / boubacar.patient");
  console.log("                 / mariam.patient @k-kouma.com /", PASSWORD_PATIENT);
  console.log("─────────────────────────────────────────────\n");
  console.log("⚠️  Change les mots de passe en production !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
