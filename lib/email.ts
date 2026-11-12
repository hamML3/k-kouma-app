import { Resend } from "resend";
import { LEGAL_ENTITY } from "@/lib/legalEntity";
import type { InvoiceView } from "@/lib/invoices";

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

/** Patient : sa facture, après encaissement ou à sa demande depuis son espace. */
export async function sendInvoiceEmail(to: string, invoice: InvoiceView) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;color:#8A9183;font-size:13px;">${label}</td><td style="padding:4px 0;text-align:right;font-size:13px;font-weight:700;color:#2C342E;">${esc(value)}</td></tr>`;
  const html = wrapper(
    `Facture ${esc(invoice.number)}`,
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(invoice.clientName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Merci pour votre paiement. Voici votre facture.</p>
     <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 8px;">
       ${row("Numéro", invoice.number)}
       ${row("Date", invoice.date)}
       ${row("Paiement", invoice.provider)}
       ${invoice.reference ? row("Référence", invoice.reference) : ""}
     </table>
     <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #EDE8DC;border-bottom:1px solid #EDE8DC;margin:8px 0;">
       <tr>
         <td style="padding:12px 0;font-size:14px;color:#2C342E;">${esc(invoice.designation)}</td>
         <td style="padding:12px 0;font-size:14px;text-align:right;white-space:nowrap;color:#2C342E;">${esc(invoice.amount)}</td>
       </tr>
     </table>
     <table role="presentation" style="width:100%;border-collapse:collapse;">
       <tr>
         <td style="padding:8px 0;font-size:15px;font-weight:700;color:#2C342E;">Total payé</td>
         <td style="padding:8px 0;font-size:17px;font-weight:700;text-align:right;color:#486946;white-space:nowrap;">${esc(invoice.amount)}</td>
       </tr>
     </table>
     ${button(`${APP_URL}/factures/${invoice.paymentId}`, "Voir et imprimer la facture")}
     <p style="font-size:12px;line-height:1.6;color:#8A9183;margin-top:24px;">
       Émise par ${esc(LEGAL_ENTITY.name)}, ${esc(LEGAL_ENTITY.address)}<br>
       RCCM : ${esc(LEGAL_ENTITY.rccm)} · NIF : ${esc(LEGAL_ENTITY.nif)}<br>
       ${esc(LEGAL_ENTITY.phone)} · ${esc(LEGAL_ENTITY.email)}
       ${invoice.taxNote ? `<br>${esc(invoice.taxNote)}` : ""}
     </p>`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: `Votre facture ${invoice.number} — K-Kouma`,
    html,
  });
}

export type PayoutStatement = {
  firstName: string;
  payoutId: number;
  date: string;
  amount: string;
  phone: string;
  reference: string;
  lines: { date: string; format: string; commission: string; amount: string }[];
};

/** Relevé d'un versement au praticien : les séances payées, sans nom de patient. */
export async function sendPayoutStatementEmail(to: string, s: PayoutStatement) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;color:#8A9183;font-size:13px;">${label}</td><td style="padding:4px 0;text-align:right;font-size:13px;font-weight:700;color:#2C342E;">${esc(value)}</td></tr>`;
  const sessions = s.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#2C342E;border-top:1px solid #EDE8DC;">${esc(l.date)} · ${esc(l.format)}${
          l.commission ? `<br><span style="color:#8A9183;font-size:12px;">Commission K-Kouma ${esc(l.commission)}</span>` : ""
        }</td><td style="padding:6px 0;font-size:13px;text-align:right;white-space:nowrap;color:#2C342E;border-top:1px solid #EDE8DC;">${esc(l.amount)}</td></tr>`
    )
    .join("");
  const html = wrapper(
    "Relevé de versement",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(s.firstName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Nous vous avons envoyé vos gains par Orange Money. Voici le détail.</p>
     <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 8px;">
       ${row("Relevé", `V-${String(s.payoutId).padStart(6, "0")}`)}
       ${row("Date", s.date)}
       ${row("Envoyé au", s.phone)}
       ${row("Référence Orange Money", s.reference)}
     </table>
     <p style="font-size:13px;font-weight:700;color:#2C342E;margin:16px 0 4px;">Séances payées (${s.lines.length})</p>
     <table role="presentation" style="width:100%;border-collapse:collapse;">${sessions}</table>
     <table role="presentation" style="width:100%;border-collapse:collapse;border-top:2px solid #EDE8DC;margin-top:4px;">
       <tr>
         <td style="padding:10px 0;font-size:15px;font-weight:700;color:#2C342E;">Total versé</td>
         <td style="padding:10px 0;font-size:17px;font-weight:700;text-align:right;color:#486946;white-space:nowrap;">${esc(s.amount)}</td>
       </tr>
     </table>
     <p style="font-size:13px;line-height:1.6;color:#5C645B;">Si vous ne trouvez pas ce transfert sur votre compte Orange Money, répondez-nous en indiquant la référence ci-dessus.</p>
     ${button(`${APP_URL}/earnings`, "Voir mes gains")}`
  );

  return client().emails.send({
    from: FROM,
    to,
    subject: `Versement de ${s.amount} — K-Kouma`,
    html,
  });
}

/** L'autre partie propose une nouvelle date pour un rendez-vous en attente. */
export async function sendAppointmentProposalEmail(to: string, recipientName: string, fromName: string, scheduledAt: Date) {
  const html = wrapper(
    "Nouvelle date proposée",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(recipientName)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;"><strong>${esc(fromName)}</strong> propose une nouvelle date pour votre séance : <strong>${formatDateTime(scheduledAt)}</strong>.</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Vous pouvez l'accepter ou proposer une autre date.</p>
     ${button(`${APP_URL}/appointments`, "Répondre")}`
  );
  return client().emails.send({ from: FROM, to, subject: "Nouvelle date proposée pour votre séance — K-Kouma", html });
}

/** Masque une adresse pour l'afficher à l'ancien titulaire : « ka***@exemple.ml ». */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain ?? ""}`;
}

/** Envoyé à la nouvelle adresse : le changement n'a lieu qu'au clic sur ce lien. */
export async function sendEmailChangeConfirmationEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/confirm-email?token=${encodeURIComponent(token)}`;
  const html = wrapper(
    "Confirmez votre nouvelle adresse e-mail",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Vous avez demandé à utiliser cette adresse pour votre compte K-Kouma. Confirmez-la en cliquant sur le bouton ci-dessous (lien valable 24 heures).</p>
     ${button(link, "Confirmer cette adresse")}
     <p style="font-size:12px;line-height:1.6;color:#8A9183;margin-top:20px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien ne changera.</p>`
  );
  return client().emails.send({ from: FROM, to, subject: "Confirmez votre nouvelle adresse — K-Kouma", html });
}

/** Envoyé à l'ancienne adresse : alerte de sécurité, à la demande puis au changement effectif. */
export async function sendEmailChangeNoticeEmail(to: string, name: string, newEmail: string, done: boolean) {
  const html = wrapper(
    done ? "Votre adresse e-mail a été modifiée" : "Demande de changement d'adresse e-mail",
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">${
       done
         ? `L'adresse de votre compte K-Kouma est désormais <strong>${esc(maskEmail(newEmail))}</strong>. Vous ne recevrez plus nos messages à cette adresse.`
         : `Une demande de changement d'adresse vers <strong>${esc(maskEmail(newEmail))}</strong> a été faite depuis votre compte. Elle ne prendra effet qu'une fois confirmée depuis la nouvelle adresse.`
     }</p>
     <p style="font-size:14px;line-height:1.6;color:#5C645B;">Si vous n'êtes pas à l'origine de ce changement, changez votre mot de passe et écrivez-nous immédiatement à contact@k-kouma.com.</p>`
  );
  return client().emails.send({
    from: FROM,
    to,
    subject: done ? "Votre adresse e-mail a été modifiée — K-Kouma" : "Changement d'adresse e-mail demandé — K-Kouma",
    html,
  });
}

/**
 * Avis sur un rendez-vous (accusé de réception, rappel, date acceptée,
 * demande expirée…). `lines` est du texte brut : échappé ici.
 */
export async function sendAppointmentNoticeEmail(params: {
  to: string;
  name: string;
  subject: string;
  title: string;
  lines: string[];
  linkLabel?: string;
}) {
  const html = wrapper(
    esc(params.title),
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(params.name)},</p>
     ${params.lines.map((l) => `<p style="font-size:14px;line-height:1.6;color:#5C645B;">${esc(l)}</p>`).join("")}
     ${button(`${APP_URL}/appointments`, params.linkLabel ?? "Voir mes rendez-vous")}`
  );
  return client().emails.send({ from: FROM, to: params.to, subject: `${params.subject} — K-Kouma`, html });
}

export type CampaignContent = {
  subject: string;
  body: string;
  category: "promotion" | "information";
  buttonLabel?: string | null;
  buttonUrl?: string | null;
};

/**
 * E-mail groupé, personnalisé par destinataire. Le texte est saisi en clair
 * dans l'administration : échappé ici, une ligne vide sépare les paragraphes.
 * Une promotion porte toujours son lien de désinscription.
 */
export function renderCampaignHtml(content: CampaignContent, name: string, unsubscribeUrl: string | null): string {
  const paragraphs = content.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="font-size:14px;line-height:1.6;color:#5C645B;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta =
    content.buttonLabel && content.buttonUrl ? button(esc(content.buttonUrl), esc(content.buttonLabel)) : "";
  const footer =
    content.category === "promotion" && unsubscribeUrl
      ? `Vous recevez cet e-mail car vous avez un compte K-Kouma. <a href="${esc(unsubscribeUrl)}" style="color:#8A9183;">Se désinscrire des actualités et offres</a>.`
      : "Message d'information concernant votre compte K-Kouma.";
  return wrapper(
    esc(content.subject),
    `<p style="font-size:14px;line-height:1.6;color:#5C645B;">Bonjour ${esc(name)},</p>
     ${paragraphs}
     ${cta}
     <p style="font-size:11px;line-height:1.6;color:#8A9183;margin-top:28px;">${footer}</p>`
  );
}

export type CampaignMessage = { to: string; subject: string; html: string; oneClickUnsubscribeUrl: string | null };

/** Envoi par lots (100 au plus par appel Resend). Renvoie le nombre d'e-mails acceptés. */
export async function sendCampaignBatch(messages: CampaignMessage[]): Promise<number> {
  const { error } = await client().batch.send(
    messages.map((m) => ({
      from: FROM,
      to: m.to,
      subject: m.subject,
      html: m.html,
      // Désinscription en un clic depuis Gmail, Outlook… (exigé des envois groupés).
      ...(m.oneClickUnsubscribeUrl
        ? { headers: { "List-Unsubscribe": `<${m.oneClickUnsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        : {}),
    }))
  );
  if (error) throw new Error(error.message);
  return messages.length;
}
