'use client'

import { useState, type InputHTMLAttributes } from "react";

/** Champ mot de passe avec un bouton œil pour afficher/masquer la saisie. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${props.className ?? ""} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute top-1/2 right-3.5 -translate-y-1/2 flex items-center justify-center"
        style={{ color: "var(--kk-faint)" }}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M2.5 10s3-6 7.5-6 7.5 6 7.5 6-3 6-7.5 6-7.5-6-7.5-6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M2.5 10s3-6 7.5-6c1.64 0 3.03.5 4.17 1.17M17.5 10s-1.09 2.18-3.17 3.83M8.2 8.2a2.5 2.5 0 0 0 3.6 3.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M2.5 2.5l15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
