/**
 * K-Kouman — Seed script
 * Usage : npx prisma db seed
 *
 * Crée :
 *  - 1 compte admin
 *  - 1 thérapeute de test (déjà vérifié)
 *  - 1 patient de test (onboarding complété)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding K-Kouman...\n");

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminEmail = "admin@k-kouma.com";
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("Admin@KKouma2026!", 12),
        role: "admin",
        status: "active",
      },
    });
    console.log("✅ Admin créé          →", adminEmail);
  } else {
    console.log("⏭️  Admin déjà existant →", adminEmail);
  }

  // ─── Thérapeute de test ───────────────────────────────────────────────────
  const therapistEmail = "dr.aminata@k-kouma.com";
  const therapistExists = await prisma.user.findUnique({ where: { email: therapistEmail } });

  if (!therapistExists) {
    await prisma.user.create({
      data: {
        email: therapistEmail,
        passwordHash: await bcrypt.hash("Therapist@2026!", 12),
        role: "therapist",
        status: "active",
        therapistProfile: {
          create: {
            firstName: "Aminata",
            lastName: "Coulibaly",
            bio: "Psychologue clinicienne avec 8 ans d'expérience, spécialisée dans la gestion de l'anxiété et des traumatismes. Formée aux réalités culturelles de l'Afrique de l'Ouest.",
            specialties: "Anxiété et stress,Traumatisme (PTSD)",
            languages: "Français,Bambara",
            hourlyRate: 15000,
            isVerified: true,
          },
        },
      },
    });
    console.log("✅ Thérapeute créé     →", therapistEmail);
  } else {
    console.log("⏭️  Thérapeute existant →", therapistEmail);
  }

  // ─── Patient de test ──────────────────────────────────────────────────────
  const patientEmail = "patient.test@k-kouma.com";
  const patientExists = await prisma.user.findUnique({ where: { email: patientEmail } });

  if (!patientExists) {
    await prisma.user.create({
      data: {
        email: patientEmail,
        passwordHash: await bcrypt.hash("Patient@2026!", 12),
        role: "patient",
        status: "active",
        patientProfile: {
          create: {
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
        },
      },
    });
    console.log("✅ Patient créé        →", patientEmail);
  } else {
    console.log("⏭️  Patient existant    →", patientEmail);
  }

  console.log("\n🎉 Seed terminé !\n");
  console.log("─────────────────────────────────────────────");
  console.log("  Admin      : admin@k-kouma.com");
  console.log("  Mot de passe admin  : Admin@KKouma2026!");
  console.log("  Thérapeute : dr.aminata@k-kouma.com");
  console.log("  Mot de passe thérapeute : Therapist@2026!");
  console.log("  Patient    : patient.test@k-kouma.com");
  console.log("  Mot de passe patient : Patient@2026!");
  console.log("─────────────────────────────────────────────\n");
  console.log("⚠️  Change les mots de passe en production !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
