import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "K-Kouma <noreply@k-kouma.com>";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Instancié à la demande (et non au chargement du module) : la clé n'est
// souvent présente qu'en runtime, jamais pendant `next build`.
let resend: Resend | null = null;
function client(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY manquant dans .env");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/** Pseudos et prénoms sont saisis librement : ils ne doivent pas pouvoir injecter de HTML. */
function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapper(title: string, bodyHtml: string): string {
  return `
  <div style="background:#F6F2EA;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC;">
      <div style="background:#557B53;padding:24px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;">K-Kouma</span>
      </div>
      <div style="padding:28px;color:#2C342E;">
        <h1 style="font-size:18px;margin:0 0 12px;color:#2C342E;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;background:#F6F2EA;color:#8A9183;font-size:12px;">
        K-Kouma — votre bien-être, notre mission.
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#8E7CB8;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">${label}</a>`;
}

/** Envoie le lien de vérification d'adresse email après inscription. */
export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  const html = wrapper(
    "Confirmez votre adresse email",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Merci de confirmer votre adresse email pour activer pleinement votre compte K-Kouma.</p>
     ${button(url, "Confirmer mon email")}
     <p style="font-size:12px;color:#8A9183;margin-top:20px;">Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Confirmez votre adresse email — K-Kouma",
    html,
  });
}

/** Envoie le lien de réinitialisation de mot de passe. */
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  const html = wrapper(
    "Réinitialisez votre mot de passe",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Vous avez demandé la réinitialisation de votre mot de passe K-Kouma.</p>
     ${button(url, "Choisir un nouveau mot de passe")}
     <p style="font-size:12px;color:#8A9183;margin-top:20px;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Réinitialisation de votre mot de passe — K-Kouma",
    html,
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** Thérapeute : un patient vient de réserver un créneau — en attente de sa confirmation. */
export async function sendAppointmentRequestEmail(
  to: string,
  therapistName: string,
  patientName: string,
  scheduledAt: Date
) {
  const html = wrapper(
    "Nouvelle demande de rendez-vous",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(therapistName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;"><strong>${esc(patientName)}</strong> souhaite réserver une séance le <strong>${formatDateTime(scheduledAt)}</strong>.</p>
     ${button(`${APP_URL}/patients`, "Voir et confirmer")}
     <p style="font-size:12px;color:#8A9183;margin-top:20px;">Le rendez-vous reste en attente tant que vous ne l'avez pas confirmé.</p>`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: `Nouvelle demande de rendez-vous — ${patientName}`,
    html,
  });
}

/** Patient : le thérapeute a confirmé le rendez-vous. */
export async function sendAppointmentConfirmedEmail(
  to: string,
  patientName: string,
  therapistName: string,
  scheduledAt: Date
) {
  const html = wrapper(
    "Rendez-vous confirmé",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(patientName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;"><strong>${esc(therapistName)}</strong> a confirmé votre séance du <strong>${formatDateTime(scheduledAt)}</strong>.</p>
     ${button(`${APP_URL}/appointments`, "Voir mes rendez-vous")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Votre rendez-vous est confirmé — K-Kouma",
    html,
  });
}

/** Thérapeute : le patient a annulé un rendez-vous en attente. */
export async function sendAppointmentCanceledEmail(
  to: string,
  therapistName: string,
  patientName: string,
  scheduledAt: Date
) {
  const html = wrapper(
    "Rendez-vous annulé",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(therapistName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;"><strong>${esc(patientName)}</strong> a annulé la séance du <strong>${formatDateTime(scheduledAt)}</strong>.</p>
     ${button(`${APP_URL}/patients`, "Voir mon planning")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: `Rendez-vous annulé — ${patientName}`,
    html,
  });
}

/** Thérapeute : candidature validée, compte actif. */
export async function sendTherapistVerifiedEmail(to: string, firstName: string, commissionPercent: number) {
  const html = wrapper(
    "Votre compte est vérifié !",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(firstName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Votre profil a été vérifié : vous pouvez désormais recevoir des patients sur K-Kouma.</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">K-Kouma prélève une commission de <strong>${commissionPercent}%</strong> sur chaque séance payée par un patient. Connectez-vous pour prendre connaissance de ces conditions et les accepter.</p>
     ${button(`${APP_URL}/login`, "Me connecter")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Votre compte K-Kouma est vérifié",
    html,
  });
}

/** Thérapeute : la commission K-Kouma qui s'applique à lui a changé — doit à nouveau l'accepter. */
export async function sendCommissionTermsChangedEmail(to: string, firstName: string, newPercent: number) {
  const html = wrapper(
    "Nouvelles conditions de commission",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(firstName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">La commission K-Kouma qui s'applique à vos séances a été mise à jour à <strong>${newPercent}%</strong>. Merci de prendre connaissance des nouvelles conditions et de les accepter pour continuer à recevoir des patients.</p>
     ${button(`${APP_URL}/conditions-commission`, "Voir et accepter")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Nouvelles conditions de commission — K-Kouma",
    html,
  });
}

/** Un nouveau message est arrivé sur une séance de messagerie. */
export async function sendNewMessageEmail(
  to: string,
  recipientName: string,
  senderName: string,
  appointmentUrl: string
) {
  const html = wrapper(
    "Nouveau message",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(recipientName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Vous avez reçu un nouveau message de <strong>${esc(senderName)}</strong>.</p>
     ${button(appointmentUrl, "Lire le message")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: `Nouveau message de ${senderName} — K-Kouma`,
    html,
  });
}

/** Patient et psychologue : la séance a lieu demain. */
export async function sendSessionReminderEmail(to: string, name: string, otherName: string, scheduledAt: Date) {
  const html = wrapper(
    "Votre séance approche",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Rappel : vous avez une séance avec <strong>${esc(otherName)}</strong> le <strong>${formatDateTime(scheduledAt)}</strong>.</p>
     ${button(`${APP_URL}/appointments`, "Voir mes rendez-vous")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: "Rappel : votre séance K-Kouma approche",
    html,
  });
}
