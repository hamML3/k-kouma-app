import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ConversationThread } from "@/components/ConversationThread";
import { canWrite, listMessages, loadConversation, markRead } from "@/lib/conversations";
import { EMERGENCY_NOTICE, personName } from "@/lib/conversationLabels";
import { viewerFromSession } from "@/lib/viewer";

export const metadata = { title: "Conversation — K-Kouma" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  if (!session?.user || !viewer) redirect("/login");
  const id = Number((await params).id);
  // notFound plutôt qu'un refus : on ne confirme pas qu'une conversation existe.
  const loaded = Number.isInteger(id) ? await loadConversation(id, viewer) : null;
  if (!loaded) notFound();
  const { conversation, side } = loaded;
  if (conversation.kind === "support" && side === "other") redirect(`/admin/support/${id}`);

  const [messages, writable] = await Promise.all([listMessages(id), canWrite(conversation)]);
  await markRead(id, side);

  const title =
    conversation.kind === "support"
      ? "L'équipe K-Kouma"
      : side === "owner"
      ? personName(conversation.therapist)
      : personName(conversation.owner);
  // Côté support, plusieurs membres de l'équipe peuvent répondre : tous signés « K-Kouma ».
  const labelFor: Record<number, string> = {};
  for (const m of messages) if (m.senderId !== viewer.id) labelFor[m.senderId] = conversation.kind === "support" ? "K-Kouma" : title;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      <main className="max-w-2xl mx-auto px-5 py-6">
        <Link href="/messages" className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
          ← Messages
        </Link>
        <h1 className="text-xl font-bold mt-2 mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          {title}
        </h1>
        <p className="text-xs mb-4" style={{ color: "var(--kk-muted)" }}>
          {conversation.kind === "support"
            ? "Questions sur le site, un paiement ou votre compte. L'équipe vous répond au plus vite."
            : EMERGENCY_NOTICE}
        </p>
        <ConversationThread
          conversationId={id}
          viewerId={viewer.id}
          initialMessages={messages}
          canWrite={writable}
          readOnlyText="Ce suivi est terminé : la conversation reste lisible, mais on ne peut plus y écrire."
          labelFor={labelFor}
        />
      </main>
    </div>
  );
}
