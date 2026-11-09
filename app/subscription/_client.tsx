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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* presse-papiers indisponible (navigateur ancien, page non sécurisée) : la valeur reste affichée */
        }
      }}
      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: "var(--kk-bg)", color: "var(--kk-purple-text)", border: "1px solid var(--kk-border-mid)" }}
      aria-label={label}
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

/**
 * Paiement Orange Money manuel, en trois temps : choisir la formule, payer le
 * code marchand depuis son téléphone, puis déclarer la référence reçue par
 * SMS. L'équipe valide ensuite depuis /admin/finances.
 */
export function ManualPaymentForm({
  merchantCode,
  merchantName,
  singleAmount,
  pack3Amount,
}: {
  merchantCode: string;
  merchantName: string | null;
  singleAmount: number;
  pack3Amount: number;
}) {
  const [state, action, pending] = useActionState(declareManualPaymentAction, {});
  const [pack, setPack] = useState<"single" | "pack3">("single");
  const amount = pack === "single" ? singleAmount : pack3Amount;
  // Paiement marchand Orange Money Mali : #144#8*code*montant*code secret#.
  const ussd = `#144#8*${merchantCode}*${amount}*`;

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-5 text-sm"
        style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)", border: "1px solid #C2D9BC" }}
      >
        <p className="font-bold mb-1">Déclaration reçue ✓</p>
        <p>
          Nous vérifions votre paiement sur notre compte Orange Money et créditons vos séances dès que c&apos;est
          confirmé, généralement sous quelques heures. Vous recevrez une notification.
        </p>
      </div>
    );
  }

  const stepTitle = (n: number, text: string) => (
    <p className="flex items-center gap-2 font-bold text-sm mb-3" style={{ color: "var(--kk-dark)" }}>
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
        style={{ background: "var(--kk-purple)", color: "#fff" }}
      >
        {n}
      </span>
      {text}
    </p>
  );

  return (
    <div className="rounded-2xl p-5 space-y-6" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
      <div>
        {stepTitle(1, "Choisissez votre formule")}
        <div className="flex gap-2">
          {(["single", "pack3"] as const).map((p) => {
            const active = pack === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPack(p)}
                aria-pressed={active}
                className="flex-1 rounded-xl py-2.5 px-2 text-sm font-bold transition-all"
                style={{
                  background: active ? "var(--kk-purple)" : "var(--kk-bg)",
                  color: active ? "#fff" : "var(--kk-mid)",
                  border: active ? "none" : "1px solid var(--kk-border-mid)",
                }}
              >
                {p === "single" ? "1 séance" : "Pack 3 séances"}
                <span className="block text-xs font-semibold mt-0.5" style={{ opacity: 0.9 }}>
                  {fcfa(p === "single" ? singleAmount : pack3Amount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {stepTitle(2, "Payez avec Orange Money")}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--kk-bg)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--kk-muted)" }}>
                Code marchand
              </p>
              <p className="font-bold text-xl tracking-wider" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {merchantCode}
              </p>
            </div>
            <CopyButton value={merchantCode} label="Copier le code marchand" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--kk-muted)" }}>
                Montant exact
              </p>
              <p className="font-bold text-xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {fcfa(amount)}
              </p>
            </div>
            <CopyButton value={String(amount)} label="Copier le montant" />
          </div>
        </div>
        <div className="mt-4 space-y-3 text-sm" style={{ color: "var(--kk-mid)" }}>
          <div>
            <p className="font-bold mb-1.5" style={{ color: "var(--kk-dark)" }}>Par code USSD</p>
            <div
              className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
              style={{ background: "#fff", border: "1px dashed var(--kk-border-mid)" }}
            >
              <p className="font-mono text-base break-all" style={{ color: "var(--kk-dark)" }}>
                {ussd}
                <span className="font-sans text-xs font-bold px-1.5 py-0.5 mx-0.5 rounded" style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}>
                  code secret
                </span>
                #
              </p>
              <CopyButton value={ussd} label="Copier le début de la commande USSD" />
            </div>
            <p className="text-xs mt-1.5">
              Composez cette commande en ajoutant votre code secret Orange Money avant le dernier #.
            </p>
          </div>
          <div>
            <p className="font-bold mb-1" style={{ color: "var(--kk-dark)" }}>Ou avec l&apos;application Max-It</p>
            <p>
              Ouvrez <strong style={{ color: "var(--kk-dark)" }}>Sarali</strong>, saisissez le code marchand puis le
              montant exact.
            </p>
          </div>
          {merchantName && (
            <p>
              Avant de valider, vérifiez que le bénéficiaire affiché est{" "}
              <strong style={{ color: "var(--kk-dark)" }}>{merchantName}</strong>.
            </p>
          )}
          <p>Gardez le SMS de confirmation : il contient la référence de la transaction.</p>
          <p
            className="text-xs font-semibold rounded-xl px-3 py-2"
            style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}
          >
            Votre code secret ne se tape que sur votre téléphone. K-Kouma ne vous le demandera jamais.
          </p>
        </div>
      </div>

      <form action={action} className="space-y-3">
        {stepTitle(3, "Déclarez votre paiement")}
        <input type="hidden" name="pack" value={pack} />

        <div>
          <label htmlFor="payerPhone" className="kk-label">Numéro depuis lequel vous avez payé</label>
          <input
            id="payerPhone"
            name="payerPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            className="kk-input"
            placeholder="+223 70 00 00 00"
          />
          <FieldError messages={state.fieldErrors?.payerPhone} />
        </div>

        <div>
          <label htmlFor="reference" className="kk-label">Référence de la transaction</label>
          <input
            id="reference"
            name="reference"
            type="text"
            required
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="kk-input"
            placeholder="Indiquée dans le SMS d'Orange Money"
          />
          <FieldError messages={state.fieldErrors?.reference} />
        </div>

        {state.error && <p className="kk-error text-xs">{state.error}</p>}

        <button type="submit" disabled={pending} className="kk-btn-purple w-full text-sm">
          {pending ? "Envoi…" : `J'ai payé ${fcfa(amount)} : déclarer mon paiement`}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--kk-muted)" }}>
          Vos séances sont créditées après vérification par notre équipe.
        </p>
      </form>
    </div>
  );
}
