import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWebPayment,
  getTransactionStatus,
  isOrangePaymentUrl,
  orangeOrderId,
  readWebpayConfig,
  resetWebpayTokenCache,
  webPaymentBody,
} from "./orangeMoneyWebpay";
import { decideFromStatus } from "./orangeMoneyPayments";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/invoices", () => ({ scheduleInvoiceEmail: () => {} }));
vi.mock("@/lib/notifications", () => ({ alertStaffOnTelegram: async () => {}, createNotification: async () => {} }));

const ENV = {
  ORANGE_MONEY_CLIENT_ID: "client",
  ORANGE_MONEY_CLIENT_SECRET: "secret",
  ORANGE_MONEY_MERCHANT_KEY: "a86b2087",
  ORANGE_MONEY_API_BASE: "https://api.test",
} as unknown as NodeJS.ProcessEnv;

describe("readWebpayConfig", () => {
  it("bac à sable par défaut, en OUV", () => {
    const cfg = readWebpayConfig(ENV)!;
    expect(cfg.env).toBe("dev");
    expect(cfg.sandbox).toBe(true);
    expect(cfg.currency).toBe("OUV");
  });

  it("production : XOF et segment donné", () => {
    const cfg = readWebpayConfig({ ...ENV, ORANGE_MONEY_API_ENV: "ML" })!;
    expect(cfg.env).toBe("ml");
    expect(cfg.sandbox).toBe(false);
    expect(cfg.currency).toBe("XOF");
  });

  it("ignore les guillemets copiés autour des valeurs", () => {
    expect(readWebpayConfig({ ...ENV, ORANGE_MONEY_MERCHANT_KEY: ' "a86b2087" ' })?.merchantKey).toBe("a86b2087");
  });

  it("absente si une variable manque ou si le segment est invalide", () => {
    expect(readWebpayConfig({ ...ENV, ORANGE_MONEY_MERCHANT_KEY: "" })).toBeNull();
    expect(readWebpayConfig({ ...ENV, ORANGE_MONEY_API_ENV: "../x" })).toBeNull();
  });
});

describe("webPaymentBody", () => {
  const cfg = readWebpayConfig(ENV)!;
  const input = { orderId: "KK12-ABC", amount: 10000, returnUrl: "https://k.ml/r", cancelUrl: "https://k.ml/c", notifUrl: "https://k.ml/n" };

  it("reprend les champs du guide Orange", () => {
    expect(webPaymentBody(cfg, input)).toEqual({
      merchant_key: "a86b2087",
      currency: "OUV",
      order_id: "KK12-ABC",
      amount: 10000,
      return_url: "https://k.ml/r",
      cancel_url: "https://k.ml/c",
      notif_url: "https://k.ml/n",
      lang: "fr",
      reference: "K-Kouma",
    });
  });

  it("refuse les dépassements de limites", () => {
    expect(() => webPaymentBody(cfg, { ...input, orderId: "x".repeat(31) })).toThrow();
    expect(() => webPaymentBody(cfg, { ...input, notifUrl: `https://k.ml/${"x".repeat(120)}` })).toThrow();
    expect(() => webPaymentBody(cfg, { ...input, amount: 0 })).toThrow();
  });
});

describe("orangeOrderId", () => {
  it("unique par paiement, 30 caractères au plus", () => {
    expect(orangeOrderId(42, () => "ABC123")).toBe("KK42-ABC123");
    expect(orangeOrderId(42).length).toBeLessThanOrEqual(30);
    expect(orangeOrderId(42)).not.toBe(orangeOrderId(42));
  });
});

describe("isOrangePaymentUrl", () => {
  it("n'accepte que les pages Orange en https", () => {
    expect(isOrangePaymentUrl("https://webpayment-ow-sb.orange-money.com/payment/pay_token/abc")).toBe(true);
    expect(isOrangePaymentUrl("http://webpayment-ow-sb.orange-money.com/x")).toBe(false);
    expect(isOrangePaymentUrl("https://orange-money.com.evil.test/x")).toBe(false);
    expect(isOrangePaymentUrl("https://evilorange-money.com/x")).toBe(false);
  });
});

describe("appels à l'API (fetch simulé)", () => {
  const saved = { ...process.env };
  let calls: { url: string; init: RequestInit }[];
  let responses: Response[];

  beforeEach(() => {
    Object.assign(process.env, ENV);
    resetWebpayTokenCache();
    calls = [];
    responses = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return responses.shift() ?? new Response("{}", { status: 500 });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...saved };
  });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const token = (t = "tok1") => json({ access_token: t, expires_in: 3600, token_type: "Bearer" });
  const created = () => json(
    { status: 201, message: "OK", pay_token: "f572", payment_url: "https://webpayment-ow-sb.orange-money.com/payment/pay_token/f572", notif_token: "dd49" },
    201
  );
  const input = { orderId: "KK1-A", amount: 1200, returnUrl: "https://k.ml/r", cancelUrl: "https://k.ml/c", notifUrl: "https://k.ml/n" };

  it("demande un jeton en Basic puis crée le paiement en Bearer", async () => {
    responses = [token(), created()];
    expect(await createWebPayment(input)).toEqual({
      payToken: "f572",
      paymentUrl: "https://webpayment-ow-sb.orange-money.com/payment/pay_token/f572",
      notifToken: "dd49",
    });
    expect(calls[0].url).toBe("https://api.test/oauth/v3/token");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("client:secret").toString("base64")}`);
    expect(calls[0].init.body).toBe("grant_type=client_credentials");
    expect(calls[1].url).toBe("https://api.test/orange-money-webpay/dev/v1/webpayment");
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe("Bearer tok1");
  });

  it("réutilise le jeton, et le redemande une fois s'il est refusé", async () => {
    responses = [token(), created(), json({}, 401), token("tok2"), json({ status: "SUCCESS", order_id: "KK1-A", txnid: "MP150709.1341.A00073" }, 201)];
    await createWebPayment(input);
    expect(await getTransactionStatus({ orderId: "KK1-A", amount: 1200, payToken: "f572" })).toEqual({
      status: "SUCCESS",
      txnId: "MP150709.1341.A00073",
    });
    expect(calls.map((c) => c.url.replace("https://api.test", ""))).toEqual([
      "/oauth/v3/token",
      "/orange-money-webpay/dev/v1/webpayment",
      "/orange-money-webpay/dev/v1/transactionstatus",
      "/oauth/v3/token",
      "/orange-money-webpay/dev/v1/transactionstatus",
    ]);
  });

  it("refuse une page de paiement hors d'Orange", async () => {
    responses = [token(), json({ pay_token: "f", payment_url: "https://evil.test/pay", notif_token: "n" }, 201)];
    await expect(createWebPayment(input)).rejects.toThrow();
  });

  it("refuse un état pour une autre commande ou illisible", async () => {
    responses = [token(), json({ status: "SUCCESS", order_id: "AUTRE" }, 201)];
    await expect(getTransactionStatus({ orderId: "KK1-A", amount: 1, payToken: "p" })).rejects.toThrow();
    responses = [json({ status: "BIZARRE" }, 201)];
    await expect(getTransactionStatus({ orderId: "KK1-A", amount: 1, payToken: "p" })).rejects.toThrow();
  });
});

describe("decideFromStatus", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("SUCCESS crédite, FAILED et EXPIRED échouent", () => {
    expect(decideFromStatus("SUCCESS", minutesAgo(1), now)).toBe("complete");
    expect(decideFromStatus("FAILED", minutesAgo(1), now)).toBe("fail");
    expect(decideFromStatus("EXPIRED", minutesAgo(1), now)).toBe("fail");
  });

  it("INITIATED attend, puis est annulé après 30 minutes ; PENDING attend", () => {
    expect(decideFromStatus("INITIATED", minutesAgo(5), now)).toBe("wait");
    expect(decideFromStatus("INITIATED", minutesAgo(31), now)).toBe("cancel");
    expect(decideFromStatus("PENDING", minutesAgo(90), now)).toBe("wait");
  });
});
