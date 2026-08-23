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
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${name},</p>
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
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${name},</p>
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
