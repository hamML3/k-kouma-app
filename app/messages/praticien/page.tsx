import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { openCareConversation } from "@/lib/conversations";

/** Patient : ouvre (ou crée) la conversation avec son praticien actuel. */
export default async function PractitionerConversationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "patient") redirect("/messages");
  const patientId = Number(session.user.id);
  const assignment = await prisma.patientTherapistAssignment.findFirst({
    where: { patientId, status: "active" },
    select: { therapistId: true },
  });
  if (!assignment) redirect("/therapists?error=assign");
  const id = await openCareConversation(patientId, assignment.therapistId);
  redirect(id ? `/messages/${id}` : "/messages");
}
