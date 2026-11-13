import { EventEmitter } from "events";

type ChatMessage = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
};

// Bus en mémoire, partagé par toutes les requêtes du même process Node (le VPS
// tourne un seul process PM2, donc c'est suffisant). Si l'app passe un jour en
// cluster/multi-instance, il faudra un relais externe (Redis pub/sub, etc.).
// Gardé sur globalThis en production aussi : Next compile routes et actions
// dans des paquets séparés, qui auraient sinon chacun leur propre bus (un
// message publié par une action n'atteindrait pas le flux d'une autre route).
const globalForBus = globalThis as unknown as { chatBus?: EventEmitter };

export const chatBus = (globalForBus.chatBus ??= new EventEmitter());
chatBus.setMaxListeners(0);

export function publishMessage(appointmentId: number, message: ChatMessage) {
  chatBus.emit(`appointment:${appointmentId}`, message);
}

export function publishSignal(roomId: string, fromRole: string) {
  chatBus.emit(`room:${roomId}`, fromRole);
}

export function subscribeToRoom(roomId: string, onSignal: (fromRole: string) => void): () => void {
  const event = `room:${roomId}`;
  chatBus.on(event, onSignal);
  return () => chatBus.off(event, onSignal);
}

export function subscribeToAppointment(
  appointmentId: number,
  onMessage: (message: ChatMessage) => void
): () => void {
  const event = `appointment:${appointmentId}`;
  chatBus.on(event, onMessage);
  return () => chatBus.off(event, onMessage);
}

export function publishConversationMessage(conversationId: number, message: ChatMessage) {
  chatBus.emit(`conversation:${conversationId}`, message);
}

export function subscribeToConversation(conversationId: number, onMessage: (message: ChatMessage) => void): () => void {
  const event = `conversation:${conversationId}`;
  chatBus.on(event, onMessage);
  return () => chatBus.off(event, onMessage);
}

export type LiveNotification = { id: number; title: string; body: string | null; link: string | null; createdAt: string };

/** Nouvelle notification d'un utilisateur, affichée en pop-up dans ses onglets ouverts. */
export function publishNotification(userId: number, notification: LiveNotification) {
  chatBus.emit(`user:${userId}:notification`, notification);
}

export function subscribeToNotifications(userId: number, onNotification: (n: LiveNotification) => void): () => void {
  const event = `user:${userId}:notification`;
  chatBus.on(event, onNotification);
  return () => chatBus.off(event, onNotification);
}
