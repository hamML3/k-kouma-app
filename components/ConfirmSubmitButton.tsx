'use client'

import type { ButtonHTMLAttributes } from "react";

/** Bouton de soumission qui demande confirmation avant de déclencher une action destructrice. */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage: string }) {
  return (
    <button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
