'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidUnsubscribe, unsubscribe } from "@/lib/campaigns";

/** Bouton de la page /desabonnement : le lien signé suffit, sans session. */
export async function confirmUnsubscribeAction(formData: FormData): Promise<void> {
  const u = Number(formData.get("u"));
  const t = String(formData.get("t") ?? "");
  if (!isValidUnsubscribe(u, t)) redirect("/desabonnement?etat=invalide");
  await unsubscribe(u);
  redirect(`/desabonnement?etat=ok&u=${u}&t=${t}`);
}

/** Réabonnement depuis la même page (erreur de clic). */
export async function resubscribeAction(formData: FormData): Promise<void> {
  const u = Number(formData.get("u"));
  const t = String(formData.get("t") ?? "");
  if (!isValidUnsubscribe(u, t)) redirect("/desabonnement?etat=invalide");
  await prisma.user.update({ where: { id: u }, data: { marketingOptOutAt: null } });
  redirect(`/desabonnement?etat=reabonne&u=${u}&t=${t}`);
}

/** Case « Recevoir les actualités et offres » de Mon compte. */
export async function updateMarketingPreferenceAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const wants = formData.get("marketing") === "on";
  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { marketingOptOutAt: wants ? null : new Date() },
  });
  revalidatePath("/compte");
  redirect("/compte?preferences=ok");
}
