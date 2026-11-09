'use client'

import { useActionState } from "react";
import { proposeArticleAction, type ProposeArticleState } from "@/lib/actions/articles";

const initialState: ProposeArticleState = {};

type EditableArticle = { id: number; title: string; excerpt: string; body: string; imageUrl: string | null };

export default function ProposeArticleForm({
  isAdmin,
  article,
}: {
  isAdmin: boolean;
  article?: EditableArticle | null;
}) {
  const [state, action, pending] = useActionState(proposeArticleAction, initialState);
  // Après l'envoi d'une modification, le formulaire repart à vide (nouvel article).
  const current = state.success ? null : article ?? null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
      {state.success && (
        <div
          className="rounded-xl p-4 mb-5 flex items-center gap-3"
          style={{ background: "var(--kk-green-light)", border: "1px solid #C2D9BC" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
            <circle cx="10" cy="10" r="9" stroke="#557B53" strokeWidth="1.6" />
            <path d="M6 10l3 3 5-5" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: "var(--kk-green-text)" }}>
            {state.published
              ? "Votre article a été publié."
              : state.edited
              ? "Vos modifications ont été envoyées. L'article est de nouveau en attente de relecture."
              : "Votre article a bien été envoyé. Il sera relu par notre équipe avant publication."}
          </p>
        </div>
      )}
      {state.error && <div className="kk-error mb-5">{state.error}</div>}

      <form action={action} className="space-y-4" key={state.success ? "sent" : `form-${current?.id ?? "new"}`}>
        {current && <input type="hidden" name="articleId" value={current.id} />}
        <div>
          <label htmlFor="title" className="kk-label">Titre</label>
          <input id="title" name="title" type="text" required maxLength={200} defaultValue={current?.title} className="kk-input" placeholder="ex. Apprendre à poser ses limites" />
          {state.fieldErrors?.title && <p className="kk-error mt-1">{state.fieldErrors.title[0]}</p>}
        </div>

        <div>
          <label htmlFor="excerpt" className="kk-label">Accroche</label>
          <input
            id="excerpt"
            name="excerpt"
            type="text"
            required
            maxLength={300}
            defaultValue={current?.excerpt}
            className="kk-input"
            placeholder="Une phrase qui donne envie de lire l'article"
          />
          {state.fieldErrors?.excerpt && <p className="kk-error mt-1">{state.fieldErrors.excerpt[0]}</p>}
        </div>

        <div>
          <label htmlFor="imageUrl" className="kk-label">
            Image (optionnel){" "}
            <span className="font-normal" style={{ color: "var(--kk-faint)" }}>
              — URL d&apos;une image
            </span>
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            maxLength={512}
            defaultValue={current?.imageUrl ?? ""}
            className="kk-input"
            placeholder="https://…"
          />
          {state.fieldErrors?.imageUrl && <p className="kk-error mt-1">{state.fieldErrors.imageUrl[0]}</p>}
        </div>

        <div>
          <label htmlFor="body" className="kk-label">Article</label>
          <textarea
            id="body"
            name="body"
            required
            rows={14}
            defaultValue={current?.body}
            className="kk-input resize-y"
            placeholder="Rédigez votre article. Laissez une ligne vide entre les paragraphes."
          />
          {state.fieldErrors?.body && <p className="kk-error mt-1">{state.fieldErrors.body[0]}</p>}
        </div>

        <button type="submit" disabled={pending} className="kk-btn-green w-full">
          {pending
            ? "Envoi…"
            : isAdmin
            ? "Publier"
            : current
            ? "Renvoyer pour relecture"
            : "Envoyer pour validation"}
        </button>
      </form>
    </div>
  );
}
