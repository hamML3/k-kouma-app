// Client de l'API Orange Money Web Payment (guide « API webpayment » d'Orange) :
//
//   1. jeton d'accès OAuth2 : POST {base}/oauth/v3/token, en-tête Basic
//      base64(client_id:client_secret), grant_type=client_credentials ;
//   2. création du paiement : POST {base}/orange-money-webpay/{env}/v1/webpayment,
//      qui renvoie pay_token, payment_url (page Orange où le patient paie) et
//      notif_token (qui authentifie la notification envoyée ensuite) ;
//   3. état d'une transaction : POST …/v1/transactionstatus.
//
// {env} vaut « dev » pour le bac à sable (sandbox, devise OUV) ; en
// production, c'est le segment communiqué par Orange Mali, et la devise est
// le XOF. Comme PayDunya et Resend, tout est facultatif : sans les variables
// du .env, le reste du site fonctionne et ce mode de paiement n'est pas proposé.
//
// Les identifiants ne sont jamais écrits dans les journaux.

const TIMEOUT_MS = 15_000;
const DEFAULT_API_BASE = "https://api.orange.com";

/** Limites du guide Orange : order_id et reference ≤ 30, chaque URL ≤ 120. */
export const ORDER_ID_MAX = 30;
export const URL_MAX = 120;

export type WebpayConfig = {
  clientId: string;
  clientSecret: string;
  merchantKey: string;
  /** Segment d'URL : « dev » (sandbox) ou celui de la production. */
  env: string;
  apiBase: string;
  sandbox: boolean;
  /** OUV dans le bac à sable, XOF en production. */
  currency: string;
};

/** Retire espaces et guillemets copiés par erreur autour d'une valeur du .env. */
function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}

export function readWebpayConfig(env: NodeJS.ProcessEnv = process.env): WebpayConfig | null {
  const clientId = clean(env.ORANGE_MONEY_CLIENT_ID);
  const clientSecret = clean(env.ORANGE_MONEY_CLIENT_SECRET);
  const merchantKey = clean(env.ORANGE_MONEY_MERCHANT_KEY);
  const apiEnv = clean(env.ORANGE_MONEY_API_ENV).toLowerCase() || "dev";
  const apiBase = (clean(env.ORANGE_MONEY_API_BASE) || DEFAULT_API_BASE).replace(/\/+$/, "");
  if (!clientId || !clientSecret || !merchantKey) return null;
  if (!/^[a-z]{2,10}$/.test(apiEnv) || !/^[A-Za-z0-9_-]{4,64}$/.test(merchantKey)) return null;
  const sandbox = apiEnv === "dev";
  return { clientId, clientSecret, merchantKey, env: apiEnv, apiBase, sandbox, currency: sandbox ? "OUV" : "XOF" };
}

export function isOrangeWebpayConfigured(): boolean {
  return readWebpayConfig() !== null;
}

/** Vrai si le paiement en ligne Orange Money passe par le bac à sable (aucun argent réel). */
export function isOrangeWebpaySandbox(): boolean {
  return readWebpayConfig()?.sandbox ?? false;
}

/**
 * order_id unique chez Orange, y compris entre le site de test et la
 * production qui partageraient la même clé marchand : numéro du paiement
 * suivi d'un suffixe aléatoire.
 */
export function orangeOrderId(paymentId: number, random: () => string = randomSuffix): string {
  return `KK${paymentId}-${random()}`.slice(0, ORDER_ID_MAX);
}

function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("").toUpperCase();
}

export class OrangeWebpayError extends Error {
  constructor(message: string, readonly httpStatus?: number) {
    super(message);
    this.name = "OrangeWebpayError";
  }
}

// ─── Jeton d'accès ──────────────────────────────────────────────────────────

type CachedToken = { value: string; expiresAt: number; key: string };

// Gardé sur globalThis : Next compile chaque route et chaque action dans son
// propre paquet, qui aurait sinon sa copie du cache et redemanderait un jeton.
const store = globalThis as typeof globalThis & { __kkOrangeWebpayToken?: CachedToken | null };

/** Pour les tests. */
export function resetWebpayTokenCache(): void {
  store.__kkOrangeWebpayToken = null;
}

async function accessToken(cfg: WebpayConfig, forceRefresh = false): Promise<string> {
  const key = `${cfg.apiBase}|${cfg.clientId}`;
  const cached = store.__kkOrangeWebpayToken;
  if (!forceRefresh && cached && cached.key === key && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const res = await fetch(`${cfg.apiBase}/oauth/v3/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!res.ok || !data?.access_token) {
    throw new OrangeWebpayError(`jeton refusé (HTTP ${res.status})`, res.status);
  }
  // Une minute de marge ; Orange annonce des jetons valables une heure à 90 jours.
  const lifetime = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;
  store.__kkOrangeWebpayToken = { value: data.access_token, expiresAt: Date.now() + Math.max(lifetime - 60, 30) * 1000, key };
  return data.access_token;
}

/** Appel authentifié ; un jeton refusé (expiré, révoqué) est redemandé une fois. */
async function callApi(cfg: WebpayConfig, path: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> | null }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await accessToken(cfg, attempt > 0);
    const res = await fetch(`${cfg.apiBase}/orange-money-webpay/${cfg.env}/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status === 401 && attempt === 0) continue;
    return { status: res.status, data: (await res.json().catch(() => null)) as Record<string, unknown> | null };
  }
  throw new OrangeWebpayError("jeton refusé deux fois", 401);
}

// ─── Paiement ───────────────────────────────────────────────────────────────

export type CreateWebPaymentInput = {
  orderId: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
  notifUrl: string;
};

export type CreateWebPaymentResult = { payToken: string; paymentUrl: string; notifToken: string };

/** La page de paiement doit être chez Orange : on ne redirige jamais le patient ailleurs. */
export function isOrangePaymentUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "orange-money.com" || url.hostname.endsWith(".orange-money.com"));
  } catch {
    return false;
  }
}

export function webPaymentBody(cfg: WebpayConfig, input: CreateWebPaymentInput) {
  if (input.orderId.length > ORDER_ID_MAX) throw new OrangeWebpayError("order_id trop long");
  for (const url of [input.returnUrl, input.cancelUrl, input.notifUrl]) {
    if (url.length > URL_MAX) throw new OrangeWebpayError("URL de retour trop longue (120 caractères au plus)");
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new OrangeWebpayError("montant invalide");
  return {
    merchant_key: cfg.merchantKey,
    currency: cfg.currency,
    order_id: input.orderId,
    amount: input.amount,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notif_url: input.notifUrl,
    lang: "fr",
    // « reference » désigne le nom du marchand affiché au client.
    reference: "K-Kouma",
  };
}

/** Crée le paiement chez Orange et renvoie la page où rediriger le patient. */
export async function createWebPayment(input: CreateWebPaymentInput): Promise<CreateWebPaymentResult> {
  const cfg = readWebpayConfig();
  if (!cfg) throw new OrangeWebpayError("API Orange Money non configurée");
  const { status, data } = await callApi(cfg, "webpayment", webPaymentBody(cfg, input));
  const payToken = typeof data?.pay_token === "string" ? data.pay_token : "";
  const paymentUrl = typeof data?.payment_url === "string" ? data.payment_url : "";
  const notifToken = typeof data?.notif_token === "string" ? data.notif_token : "";
  if (status >= 300 || !payToken || !notifToken || !isOrangePaymentUrl(paymentUrl)) {
    const detail = typeof data?.message === "string" ? data.message.slice(0, 200) : "";
    throw new OrangeWebpayError(`création refusée (HTTP ${status}${detail ? ` : ${detail}` : ""})`, status);
  }
  if (payToken.length > 255 || notifToken.length > 64) throw new OrangeWebpayError("réponse inattendue");
  return { payToken, paymentUrl, notifToken };
}

export type OrangeTxnStatus = "INITIATED" | "PENDING" | "EXPIRED" | "SUCCESS" | "FAILED";
const KNOWN_STATUSES: readonly string[] = ["INITIATED", "PENDING", "EXPIRED", "SUCCESS", "FAILED"];

export type TransactionStatusResult = { status: OrangeTxnStatus; txnId: string | null };

/** État réel d'une transaction, demandé directement à Orange. */
export async function getTransactionStatus(input: { orderId: string; amount: number; payToken: string }): Promise<TransactionStatusResult> {
  const cfg = readWebpayConfig();
  if (!cfg) throw new OrangeWebpayError("API Orange Money non configurée");
  const { status, data } = await callApi(cfg, "transactionstatus", {
    order_id: input.orderId,
    amount: input.amount,
    pay_token: input.payToken,
  });
  const txnStatus = typeof data?.status === "string" ? data.status.toUpperCase() : "";
  if (status >= 300 || !KNOWN_STATUSES.includes(txnStatus)) {
    throw new OrangeWebpayError(`état illisible (HTTP ${status})`, status);
  }
  // Une réponse pour une autre commande ne doit jamais valider celle-ci.
  if (typeof data?.order_id === "string" && data.order_id !== input.orderId) {
    throw new OrangeWebpayError("réponse pour une autre commande");
  }
  return { status: txnStatus as OrangeTxnStatus, txnId: safeTxnId(data?.txnid) };
}

/** Les numéros de transaction Orange ressemblent à « MP150709.1341.A00073 ». */
export function safeTxnId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9._-]{4,64}$/.test(value) ? value : null;
}
