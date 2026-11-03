'use client'

import { useActionState } from "react";
import { buySessionsAction } from "@/lib/actions/payments";

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
