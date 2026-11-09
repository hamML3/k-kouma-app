import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { openSupportConversation } from "@/lib/conversations";

/** Patient ou praticien : ouvre (ou crée) sa conversation avec l'équipe K-Kouma. */
export default async function SupportConversationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "patient" && session.user.role !== "therapist") redirect("/admin/support");
  redirect(`/messages/${await openSupportConversation(Number(session.user.id))}`);
}
