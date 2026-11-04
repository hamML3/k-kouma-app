'use client'

import { useActionState, useId } from "react";
import { submitReviewAction, type SubmitReviewState } from "@/lib/actions/reviews";

const initialState: SubmitReviewState = {};
const RATINGS = [1, 2, 3, 4, 5];

export function ReviewForm({ appointmentId }: { appointmentId: number }) {
  const [state, action, pending] = useActionState(submitReviewAction, initialState);
  const commentId = useId();

  if (state.success) {
    return (
      <p className="text-sm rounded-xl p-3" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-hover)" }}>
        Merci ! Votre avis sera publié après relecture.
      </p>
    );
  }

  return (
    <details className="rounded-xl p-3" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
      <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--kk-green-text)" }}>
        Donner mon avis sur cette séance
      </summary>
      <form action={action} className="space-y-3 mt-3">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        {state.error && <p className="kk-error">{state.error}</p>}

        <fieldset>
          <legend className="kk-label">Votre note</legend>
          <div className="flex flex-row-reverse justify-end gap-1">
            {[...RATINGS].reverse().map((value) => (
              <label key={value} className="kk-star cursor-pointer">
                <input type="radio" name="rating" value={value} required className="sr-only" />
                <span aria-hidden>★</span>
                <span className="sr-only">
                  {value} sur 5
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={commentId} className="kk-label">
            Commentaire (optionnel)
          </label>
          <textarea id={commentId} name="comment" rows={3} maxLength={1000} className="kk-input resize-none" />
          <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
            Votre avis est anonyme. Évitez tout détail personnel ou de santé : il est relu avant publication.
          </p>
        </div>

        <button type="submit" disabled={pending} className="kk-btn-green">
          {pending ? "Envoi…" : "Envoyer mon avis"}
        </button>
      </form>
    </details>
  );
}
