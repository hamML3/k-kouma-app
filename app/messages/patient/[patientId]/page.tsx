import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { openCareConversation } from "@/lib/conversations";

/** Praticien : ouvre (ou crée) la conversation avec un patient qu'il suit. */
export default async function PatientConversationPage({ params }: { params: Promise<{ patientId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/messages");
  const patientId = Number((await params).patientId);
  const id = Number.isInteger(patientId) ? await openCareConversation(patientId, Number(session.user.id)) : null;
  redirect(id ? `/messages/${id}` : "/messages");
}
