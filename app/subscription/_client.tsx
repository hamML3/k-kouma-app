'use client'

import { useActionState, useState } from "react";
import { buySessionsAction, declareManualPaymentAction } from "@/lib/actions/payments";

export function BuyButton({
  pack,
  label,
  className,
  style,
  disabled,
}: {
  pack: "single" | "pack3";
  label: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(buySessionsAction, {});

  return (
    <form action={action}>
      <input type="hidden" name="pack" value={pack} />
      <button
        type="submit"
        disabled={pending || disabled}
        className={`${className ?? ""} disabled:opacity-50 disabled:cursor-not-allowed`}
        style={style}
      >
        {pending ? "Redirection…" : label}
      </button>
      {state.error && (
        <p className="kk-error mt-2 text-xs">{state.error}</p>
      )}
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs font-medium" style={{ color: "#C0392B" }}>
      {messages[0]}
    </p>
  );
}

/** Déclaration d'un paiement Orange Money déjà envoyé (appli ou USSD) — vérifié ensuite par un admin. */
export function ManualPaymentForm({
  singleAmount,
  pack3Amount,
}: {
  singleAmount: string;
  pack3Amount: string;
}) {
  const [state, action, pending] = useActionState(declareManualPaymentAction, {});
  const [pack, setPack] = useState<"single" | "pack3">("single");

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-5 text-sm"
        style={{ background: "var(--kk-green-light)", color: "var(--kk-green)", border: "1px solid #C2D9BC" }}
      >
        <p className="font-bold mb-1">Déclaration reçue ✓</p>
        <p>
          Nous vérifions votre paiement et créditons vos séances dès que c&apos;est confirmé — généralement sous
          quelques heures.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl p-5 space-y-3" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
      <div className="flex gap-2">
        {(["single", "pack3"] as const).map((p) => {
          const active = pack === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPack(p)}
              className="flex-1 rounded-xl py-2 text-sm font-bold transition-all"
              style={{
                background: active ? "var(--kk-purple)" : "var(--kk-bg)",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1px solid var(--kk-border-mid)",
              }}
            >
              {p === "single" ? `1 séance · ${singleAmount}` : `Pack 3 · ${pack3Amount}`}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="pack" value={pack} />

      <div>
        <label htmlFor="payerPhone" className="kk-label">Numéro depuis lequel vous avez payé</label>
        <input id="payerPhone" name="payerPhone" type="tel" required className="kk-input" placeholder="+223 70 000 000" />
        <FieldError messages={state.fieldErrors?.payerPhone} />
      </div>

      <div>
        <label htmlFor="reference" className="kk-label">Référence de la transaction</label>
        <input
          id="reference"
          name="reference"
          type="text"
          required
          className="kk-input"
          placeholder="Reçue par SMS après le paiement"
        />
        <FieldError messages={state.fieldErrors?.reference} />
      </div>

      {state.error && <p className="kk-error text-xs">{state.error}</p>}

      <button type="submit" disabled={pending} className="kk-btn-purple w-full text-sm">
        {pending ? "Envoi…" : "Déclarer mon paiement"}
      </button>
    </form>
  );
}
