import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminUrl,
  escapeTelegramHtml,
  scheduleStaffAlert,
  sendStaffAlert,
  sendTelegramMessage,
  staffAlertMessage,
  telegramStatus,
} from "./telegram";

// Jeton factice au bon format : aucun appel réel n'est fait (fetch est simulé).
const FAKE_TOKEN = "123456789:AAFakeTokenForTestsOnly_0123456789abc";
const FAKE_CHAT_ID = "-1001234567890";

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

function configure() {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", FAKE_TOKEN);
  vi.stubEnv("TELEGRAM_CHAT_ID", FAKE_CHAT_ID);
}

function sentPayload(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as { chat_id: string; text: string; parse_mode: string };
}

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  vi.stubEnv("TELEGRAM_CHAT_ID", "");
  vi.stubEnv("NEXTAUTH_URL", "https://k-kouma.test");
  fetchMock = vi.fn(async () => okResponse());
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sans configuration", () => {
  it("n'appelle jamais Telegram et ne logue rien", async () => {
    expect(await sendTelegramMessage("test")).toBe(false);
    expect(await sendStaffAlert({ type: "report.filed", link: "/admin/reports" })).toBe(false);
    scheduleStaffAlert({ type: "report.filed", link: "/admin/reports" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(telegramStatus()).toEqual({ state: "missing" });
  });

  it("une seule des deux variables ne suffit pas", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", FAKE_TOKEN);
    expect(await sendTelegramMessage("test")).toBe(false);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", FAKE_CHAT_ID);
    expect(await sendTelegramMessage("test")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un jeton mal formé est traité comme absent (il ne doit pas modifier l'URL appelée)", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc/../../evil?x=");
    vi.stubEnv("TELEGRAM_CHAT_ID", FAKE_CHAT_ID);
    expect(await sendTelegramMessage("test")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(telegramStatus()).toEqual({ state: "invalid" });
  });
});

describe("telegramStatus", () => {
  it("ne révèle que la fin du chat id, jamais le jeton", () => {
    configure();
    const status = telegramStatus();
    expect(status).toEqual({ state: "configured", chatIdHint: "…7890" });
    expect(JSON.stringify(status)).not.toContain(FAKE_TOKEN);
    expect(JSON.stringify(status)).not.toContain(FAKE_CHAT_ID);
  });
});

describe("escapeTelegramHtml", () => {
  it("échappe &, < et >", () => {
    expect(escapeTelegramHtml("a & b <i>c</i> > d")).toBe("a &amp; b &lt;i&gt;c&lt;/i&gt; &gt; d");
  });

  it("n'échappe pas deux fois l'esperluette", () => {
    expect(escapeTelegramHtml("&lt;")).toBe("&amp;lt;");
  });

  it("le titre d'un article ne peut pas injecter de balise", () => {
    const message = staffAlertMessage({
      type: "article.proposed",
      link: "/admin/articles",
      alert: { articleTitle: '<a href="https://evil.test">Stress & sommeil</a>' },
    });
    expect(message).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;Stress &amp; sommeil&lt;/a&gt;");
    expect(message).not.toContain('<a href="https://evil.test"');
  });
});

describe("liste blanche des événements", () => {
  it("un type non listé n'envoie rien", async () => {
    configure();
    for (const type of ["message.received", "appointment.booked", "toString", "__proto__", "constructor"]) {
      expect(staffAlertMessage({ type })).toBeNull();
      expect(await sendStaffAlert({ type, link: "/admin" })).toBe(false);
    }
    scheduleStaffAlert({ type: "message.received", link: "/admin" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un type listé part avec parse_mode HTML vers le bon chat", async () => {
    configure();
    expect(await sendStaffAlert({ type: "report.filed", link: "/admin/reports" })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${FAKE_TOKEN}/sendMessage`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const payload = sentPayload(fetchMock);
    expect(payload.chat_id).toBe(FAKE_CHAT_ID);
    expect(payload.parse_mode).toBe("HTML");
    expect(payload.text).toContain("Nouveau signalement à examiner");
    expect(payload.text).toContain('<a href="https://k-kouma.test/admin/reports">');
  });

  it("le message d'un paiement reprend montant et référence, rien d'autre", () => {
    const message = staffAlertMessage({
      type: "payment.declared",
      link: "/admin/finances",
      alert: { amount: 15000, currency: "XOF", reference: "PP231109.1234.A12345" },
    });
    expect(message).toContain("Paiement Orange Money à vérifier");
    expect(message).toMatch(/Montant : 15\s000 XOF/u);
    expect(message).toContain("<code>PP231109.1234.A12345</code>");
  });

  it("une référence en texte libre (saisie par le patient) n'est pas envoyée", () => {
    const message = staffAlertMessage({
      type: "payment.declared",
      alert: { amount: 15000, currency: "XOF", reference: "Aminata Traoré 76 00 00 00" },
    });
    expect(message).not.toContain("Aminata");
    expect(message).not.toContain("Référence");
  });

  it("les types sans faits n'envoient que le titre et le lien", () => {
    const message = staffAlertMessage({
      type: "review.submitted",
      link: "/admin/reviews",
      alert: { articleTitle: "ne doit pas apparaître", reference: "ABCD1234" },
    });
    expect(message).not.toContain("ne doit pas apparaître");
    expect(message).not.toContain("ABCD1234");
  });
});

describe("adminUrl", () => {
  it("construit un lien absolu vers l'administration depuis NEXTAUTH_URL", () => {
    expect(adminUrl("/admin/therapists/42")).toBe("https://k-kouma.test/admin/therapists/42");
  });

  it("écarte tout lien hors de l'administration ou hors du site", () => {
    expect(adminUrl("/appointments/12/chat")).toBeNull();
    expect(adminUrl("https://evil.test/admin")).toBeNull();
    expect(adminUrl("//evil.test/admin")).toBeNull();
    expect(adminUrl("/admin//evil.test")).toBeNull();
    expect(adminUrl("/admin\\evil")).toBeNull();
    expect(adminUrl("/administrateur")).toBeNull();
    expect(adminUrl(undefined)).toBeNull();
  });

  it("sans NEXTAUTH_URL, pas de lien (le message part quand même)", async () => {
    configure();
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(adminUrl("/admin")).toBeNull();
    expect(await sendStaffAlert({ type: "report.filed", link: "/admin/reports" })).toBe(true);
    expect(sentPayload(fetchMock).text).not.toContain("<a ");
  });
});

describe("robustesse", () => {
  it("ne lève pas si fetch échoue, et ne logue jamais le jeton", async () => {
    configure();
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed for https://api.telegram.org/bot${FAKE_TOKEN}/x`));
    await expect(sendStaffAlert({ type: "report.filed" })).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(FAKE_TOKEN);
  });

  it("ne lève pas si la requête expire", async () => {
    configure();
    fetchMock.mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(sendTelegramMessage("test")).resolves.toBe(false);
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("TimeoutError");
  });

  it("interrompt réellement une requête qui ne répond pas", async () => {
    configure();
    // Délai réel de 5 s demandé ; raccourci ici pour que le test reste rapide.
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => realTimeout(20));
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    );
    await expect(sendTelegramMessage("test")).resolves.toBe(false);
    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("TimeoutError");
  });

  it("ne lève pas si Telegram refuse, et expurge le jeton de sa réponse", async () => {
    configure();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: `Bad Request: chat not found ${FAKE_TOKEN}` }), {
        status: 400,
      })
    );
    await expect(sendTelegramMessage("test")).resolves.toBe(false);
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("chat not found");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(FAKE_TOKEN);
  });

  it("ne lève pas si la réponse d'erreur n'est pas du JSON", async () => {
    configure();
    fetchMock.mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 }));
    await expect(sendTelegramMessage("test")).resolves.toBe(false);
  });

  it("hors requête Next.js, scheduleStaffAlert envoie en tâche de fond sans lever", async () => {
    configure();
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(() => scheduleStaffAlert({ type: "therapist.registered", link: "/admin/therapists/7" })).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});
