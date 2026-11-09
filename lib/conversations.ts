import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { decryptText, encryptText } from "@/lib/noteEncryption";
import { publishConversationMessage } from "@/lib/chatBus";
import { createNotification, notifyStaff } from "@/lib/notifications";
import { sendNewMessageEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

// Messagerie hors séance, ouverte à toute heure (modèle Conversation) :
//   - care : un patient et le praticien qu'il a choisi ;
//   - support : un patient ou un praticien et l'équipe K-Kouma.
// Les droits se vérifient toujours ici, à partir de la session, jamais d'un
// identifiant fourni par le navigateur. Les messages sont chiffrés en base.

export const MAX_MESSAGE_LENGTH = 4000;

export type Viewer = { id: number; role: string; permissions?: unknown };
export type ConversationMessageView = { id: number; senderId: number; body: string; createdAt: string };

type ConversationRow = {
  id: number;
  kind: "care" | "support";
  ownerId: number;
  therapistId: number | null;
  ownerReadAt: Date | null;
  otherReadAt: Date | null;
  lastMessageAt: Date | null;
};

const context = (conversationId: number) => `conversation-message:${conversationId}`;

export function isSupportStaff(viewer: Viewer): boolean {
  return (viewer.role === "admin" || viewer.role === "moderator") && hasPermission(viewer.role, viewer.permissions, "manage_support");
}

/** Côté de la conversation où se trouve ce lecteur, ou null s'il n'y a pas accès. */
export function sideOf(conversation: Pick<ConversationRow, "kind" | "ownerId" | "therapistId">, viewer: Viewer): "owner" | "other" | null {
  if (conversation.ownerId === viewer.id) return "owner";
  if (conversation.kind === "care" && conversation.therapistId === viewer.id) return "other";
  if (conversation.kind === "support" && isSupportStaff(viewer)) return "other";
  return null;
}

async function activeAssignment(patientId: number, therapistId: number): Promise<boolean> {
  return Boolean(
    await prisma.patientTherapistAssignment.findFirst({
      where: { patientId, therapistId, status: "active" },
      select: { id: true },
    })
  );
}

/** Conversation patient ↔ praticien ; ne se crée que s'ils sont liés par un suivi actif. */
export async function openCareConversation(patientId: number, therapistId: number): Promise<number | null> {
  const key = `care:${patientId}:${therapistId}`;
  const existing = await prisma.conversation.findUnique({ where: { key }, select: { id: true } });
  if (existing) return existing.id;
  if (!(await activeAssignment(patientId, therapistId))) return null;
  return upsertConversation(key, { kind: "care", ownerId: patientId, therapistId });
}

/** Conversation d'un patient ou d'un praticien avec l'équipe K-Kouma. */
export async function openSupportConversation(userId: number): Promise<number> {
  return upsertConversation(`support:${userId}`, { kind: "support", ownerId: userId, therapistId: null });
}

async function upsertConversation(
  key: string,
  data: { kind: "care" | "support"; ownerId: number; therapistId: number | null }
): Promise<number> {
  const row = await prisma.conversation.upsert({ where: { key }, create: { key, ...data }, update: {}, select: { id: true } });
  return row.id;
}

/** Une conversation de suivi n'accepte plus de message une fois le suivi terminé (historique en lecture). */
export async function canWrite(conversation: ConversationRow): Promise<boolean> {
  if (conversation.kind === "support") return true;
  return conversation.therapistId !== null && activeAssignment(conversation.ownerId, conversation.therapistId);
}

export async function loadConversation(id: number, viewer: Viewer) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, email: true, role: true, patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true, lastName: true } } } },
      therapist: { select: { id: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!conversation) return null;
  const side = sideOf(conversation, viewer);
  if (!side) return null;
  return { conversation, side };
}

export async function listMessages(conversationId: number, after?: Date): Promise<ConversationMessageView[]> {
  const rows = await prisma.conversationMessage.findMany({
    where: { conversationId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: 100,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });
  const ordered = after ? rows : rows.reverse();
  return ordered.map((m) => ({ id: m.id, senderId: m.senderId, body: readBody(m.body, conversationId), createdAt: m.createdAt.toISOString() }));
}

function readBody(stored: string, conversationId: number): string {
  try {
    return decryptText(stored, context(conversationId));
  } catch {
    return "[message illisible]";
  }
}

export async function markRead(conversationId: number, side: "owner" | "other"): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: side === "owner" ? { ownerReadAt: new Date() } : { otherReadAt: new Date() },
  });
}

export type SendResult = { ok: true; message: ConversationMessageView } | { ok: false; status: number; error: string };

/** Envoi d'un message : contrôle d'accès, chiffrement, diffusion en direct, notification du destinataire. */
export async function sendConversationMessage(conversationId: number, viewer: Viewer, rawBody: unknown): Promise<SendResult> {
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) return { ok: false, status: 400, error: "Message vide." };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, status: 400, error: "Message trop long (4000 caractères au maximum)." };
  if (!rateLimit(`conversation:${viewer.id}`, 30, 60_000).allowed) {
    return { ok: false, status: 429, error: "Trop de messages d'affilée. Patientez un instant." };
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  const side = conversation && sideOf(conversation, viewer);
  if (!conversation || !side) return { ok: false, status: 403, error: "Accès refusé." };
  if (!(await canWrite(conversation))) {
    return { ok: false, status: 403, error: "Ce suivi est terminé : la conversation reste lisible, mais on ne peut plus y écrire." };
  }

  let encrypted: string;
  try {
    encrypted = encryptText(body, context(conversationId));
  } catch (err) {
    console.error("[messagerie] chiffrement impossible:", err instanceof Error ? err.message : err);
    return { ok: false, status: 503, error: "La messagerie est momentanément indisponible." };
  }

  const now = new Date();
  const created = await prisma.conversationMessage.create({
    data: { conversationId, senderId: viewer.id, body: encrypted, createdAt: now },
    select: { id: true, senderId: true, createdAt: true },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: now, ...(side === "owner" ? { ownerReadAt: now } : { otherReadAt: now }) },
  });

  const message = { id: created.id, senderId: created.senderId, body, createdAt: created.createdAt.toISOString() };
  publishConversationMessage(conversationId, message);

  // Le destinataire n'est prévenu qu'au premier message non lu : pas une
  // notification (ni un e-mail) par message d'une même conversation.
  const recipientReadAt = side === "owner" ? conversation.otherReadAt : conversation.ownerReadAt;
  const wasCaughtUp = !conversation.lastMessageAt || (recipientReadAt !== null && recipientReadAt >= conversation.lastMessageAt);
  if (wasCaughtUp) void notifyRecipient(conversation, side);

  return { ok: true, message };
}

async function notifyRecipient(conversation: ConversationRow, senderSide: "owner" | "other"): Promise<void> {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    if (conversation.kind === "support" && senderSide === "owner") {
      const owner = await prisma.user.findUnique({ where: { id: conversation.ownerId }, select: { role: true } });
      await notifyStaff("manage_support", {
        type: "support.message",
        title: "Nouveau message au support",
        body: owner?.role === "therapist" ? "D'un praticien." : "D'un patient.",
        link: `/admin/support/${conversation.id}`,
        alert: { fromRole: owner?.role === "therapist" ? "praticien" : "patient" },
      });
      return;
    }

    const recipientId = senderSide === "owner" ? conversation.therapistId : conversation.ownerId;
    if (!recipientId) return;
    const [recipient, senderName] = await Promise.all([
      prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true } } },
      }),
      senderLabel(conversation, senderSide),
    ]);
    if (!recipient) return;
    await createNotification({
      userId: recipientId,
      type: "message.conversation",
      title: `Nouveau message de ${senderName}`,
      link: `/messages/${conversation.id}`,
    });
    const recipientName = recipient.patientProfile?.nickname ?? recipient.therapistProfile?.firstName ?? "Bonjour";
    await sendNewMessageEmail(recipient.email, recipientName, senderName, `${base}/messages/${conversation.id}`);
  } catch (err) {
    console.error("[messagerie] notification échouée:", err instanceof Error ? err.message : err);
  }
}

async function senderLabel(conversation: ConversationRow, senderSide: "owner" | "other"): Promise<string> {
  if (conversation.kind === "support") return "l'équipe K-Kouma";
  const id = senderSide === "owner" ? conversation.ownerId : conversation.therapistId;
  const user = id
    ? await prisma.user.findUnique({
        where: { id },
        select: { patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true, lastName: true } } },
      })
    : null;
  if (user?.therapistProfile) return `${user.therapistProfile.firstName} ${user.therapistProfile.lastName}`;
  return user?.patientProfile?.nickname ?? "votre interlocuteur";
}

/** Nombre de conversations avec des messages non lus, pour le menu. */
export async function unreadConversationCount(viewer: Viewer): Promise<number> {
  try {
    const rows = await prisma.conversation.findMany({
      where: {
        lastMessageAt: { not: null },
        OR: [{ ownerId: viewer.id }, { kind: "care", therapistId: viewer.id }],
      },
      select: { ownerId: true, ownerReadAt: true, otherReadAt: true, lastMessageAt: true },
    });
    return rows.filter((c) => {
      const readAt = c.ownerId === viewer.id ? c.ownerReadAt : c.otherReadAt;
      return !readAt || readAt < c.lastMessageAt!;
    }).length;
  } catch {
    return 0;
  }
}
