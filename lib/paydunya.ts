// Intégration PayDunya — API "Checkout Invoice".
// Doc : https://paydunya.com/developers/api/checkout-invoice
//
// Rien ici ne s'exécute avant qu'on appelle réellement createInvoice/confirmInvoice
// (comme pour Resend) : tant que les clés ne sont pas dans .env, le reste de
// l'app (build, dev, réservations) continue de fonctionner normalement — seul
// l'achat d'un crédit de séance échouera proprement avec un message clair.

type PaydunyaConfig = {
  masterKey: string;
  privateKey: string;
  publicKey: string;
  token: string;
  mode: "test" | "live";
};

function getConfig(): PaydunyaConfig {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY;
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
  const publicKey = process.env.PAYDUNYA_PUBLIC_KEY;
  const token = process.env.PAYDUNYA_TOKEN;
  const mode = process.env.PAYDUNYA_MODE === "live" ? "live" : "test";

  if (!masterKey || !privateKey || !publicKey || !token) {
    throw new Error(
      "PayDunya n'est pas encore configuré (clés manquantes dans .env). " +
        "Le paiement en ligne sera disponible dès que le compte PayDunya sera approuvé."
    );
  }

  return { masterKey, privateKey, publicKey, token, mode };
}

const BASE_URL = "https://app.paydunya.com/api/v1";

function authHeaders(cfg: PaydunyaConfig) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": cfg.masterKey,
    "PAYDUNYA-PRIVATE-KEY": cfg.privateKey,
    "PAYDUNYA-PUBLIC-KEY": cfg.publicKey,
    "PAYDUNYA-TOKEN": cfg.token,
  };
}

export type CreateInvoiceInput = {
  description: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  /** Retrouvé dans le webhook + à la confirmation — on y met notre Payment.id. */
  customData: Record<string, string | number>;
  callbackUrl: string;
  returnUrl: string;
  cancelUrl: string;
};

export type CreateInvoiceResult = {
  token: string;
  invoiceUrl: string;
};

/** Crée une facture de paiement et renvoie l'URL de paiement PayDunya à laquelle rediriger le patient. */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const cfg = getConfig();

  const res = await fetch(`${BASE_URL}/checkout-invoice/create`, {
    method: "POST",
    headers: authHeaders(cfg),
    body: JSON.stringify({
      invoice: {
        total_amount: input.amount,
        description: input.description,
      },
      store: {
        name: "K-Kouma",
      },
      custom_data: input.customData,
      actions: {
        callback_url: input.callbackUrl,
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
      customer: {
        name: input.customerName,
        email: input.customerEmail,
      },
    }),
  });

  const data = (await res.json()) as {
    response_code?: string;
    response_text?: string;
    token?: string;
  };

  if (data.response_code !== "00" || !data.token) {
    throw new Error(data.response_text ?? "Échec de création de la facture PayDunya");
  }

  return {
    token: data.token,
    invoiceUrl: `https://paydunya.com/checkout/invoice/${data.token}`,
  };
}

export type ConfirmInvoiceResult = {
  isCompleted: boolean;
  status: string;
  customData: Record<string, unknown>;
};

/**
 * Vérifie l'état réel d'une facture directement auprès de PayDunya — à
 * appeler depuis le webhook plutôt que de faire confiance au corps de la
 * requête IPN, qui peut être falsifié.
 */
export async function confirmInvoice(token: string): Promise<ConfirmInvoiceResult> {
  const cfg = getConfig();

  const res = await fetch(`${BASE_URL}/checkout-invoice/confirm/${token}`, {
    method: "GET",
    headers: authHeaders(cfg),
  });

  const data = (await res.json()) as {
    status?: string;
    custom_data?: Record<string, unknown>;
  };

  return {
    isCompleted: data.status === "completed",
    status: data.status ?? "unknown",
    customData: data.custom_data ?? {},
  };
}

export function isPaydunyaConfigured(): boolean {
  return Boolean(
    process.env.PAYDUNYA_MASTER_KEY &&
      process.env.PAYDUNYA_PRIVATE_KEY &&
      process.env.PAYDUNYA_PUBLIC_KEY &&
      process.env.PAYDUNYA_TOKEN
  );
}
