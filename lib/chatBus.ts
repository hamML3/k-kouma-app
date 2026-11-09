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
const globalForBus = globalThis as unknown as { chatBus?: EventEmitter };

export const chatBus = globalForBus.chatBus ?? new EventEmitter();
chatBus.setMaxListeners(0);

if (process.env.NODE_ENV !== "production") globalForBus.chatBus = chatBus;

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
