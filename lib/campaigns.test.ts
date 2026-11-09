import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.stubEnv("AUTH_SECRET", "secret-de-test");
vi.stubEnv("NEXTAUTH_URL", "https://k-kouma.test");
const { isValidUnsubscribe, unsubscribeUrl } = await import("./campaigns");
const { renderCampaignHtml } = await import("./email");

describe("lien de désinscription", () => {
  it("est signé pour une seule personne", () => {
    const url = new URL(unsubscribeUrl(42));
    expect(url.pathname).toBe("/desabonnement");
    const t = url.searchParams.get("t")!;
    expect(isValidUnsubscribe(42, t)).toBe(true);
    expect(isValidUnsubscribe(43, t)).toBe(false);
    expect(isValidUnsubscribe(42, "0".repeat(32))).toBe(false);
    expect(isValidUnsubscribe(42, "pas-un-jeton")).toBe(false);
  });
});

describe("renderCampaignHtml", () => {
  const content = { subject: "Offre <b>", body: "Ligne 1\nLigne 2\n\n<script>x</script>", category: "promotion" as const };

  it("échappe le texte saisi et découpe les paragraphes", () => {
    const html = renderCampaignHtml(content, "Kadi & co", "https://k-kouma.test/desabonnement?u=1&t=x");
    expect(html).toContain("Bonjour Kadi &amp; co");
    expect(html).toContain("Ligne 1<br>Ligne 2");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Se désinscrire");
  });

  it("une information de service n'a pas de lien de désinscription", () => {
    const html = renderCampaignHtml({ ...content, category: "information" }, "Kadi", null);
    expect(html).not.toContain("désinscrire");
    expect(html).toContain("Message d'information");
  });
});
