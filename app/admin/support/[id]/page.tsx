import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ConversationThread } from "@/components/ConversationThread";
import { hasPermission } from "@/lib/permissions";
import { listMessages, loadConversation, markRead } from "@/lib/conversations";
import { personName } from "@/lib/conversationLabels";
import { viewerFromSession } from "@/lib/viewer";

export const metadata = { title: "Support — Administration K-Kouma" };

export default async function AdminSupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  if (!viewer || !hasPermission(viewer.role, viewer.permissions, "manage_support")) redirect("/admin");
  const id = Number((await params).id);
  const loaded = Number.isInteger(id) ? await loadConversation(id, viewer) : null;
  if (!loaded || loaded.conversation.kind !== "support") notFound();
  const { conversation } = loaded;

  const messages = await listMessages(id);
  await markRead(id, "other");
  const ownerName = personName(conversation.owner);
  const labelFor: Record<number, string> = {};
  for (const m of messages) {
    if (m.senderId === viewer.id) continue;
    labelFor[m.senderId] = m.senderId === conversation.ownerId ? ownerName : "Équipe K-Kouma";
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/support" className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
        ← Support
      </Link>
      <h1 className="text-xl font-bold mt-2 mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
        {ownerName}
      </h1>
      <p className="text-xs mb-4" style={{ color: "var(--kk-muted)" }}>
        {conversation.owner.role === "therapist" ? "Praticien" : "Patient"} · {conversation.owner.email} · vos réponses sont signées
        « K-Kouma »
      </p>
      <ConversationThread conversationId={id} viewerId={viewer.id} initialMessages={messages} canWrite labelFor={labelFor} />
    </div>
  );
}
