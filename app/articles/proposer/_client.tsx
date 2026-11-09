'use client'

import { useActionState, useEffect, useRef, useState } from "react";
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

        <ImagePicker currentUrl={current?.imageUrl ?? null} error={state.fieldErrors?.image?.[0]} />

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

const MAX_SIDE = 1600;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Réduit la photo dans le navigateur avant l'envoi (1600 px, JPEG) : une photo
 * de téléphone passe de plusieurs Mo à quelques centaines de Ko, ce qui compte
 * sur une connexion mobile lente. Le serveur revérifie et réencode de toute façon.
 */
async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], "image.jpg", { type: "image/jpeg" });
}

function ImagePicker({ currentUrl, error }: { currentUrl: string | null; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files?.[0];
    setLocalError(null);
    if (!picked) {
      setPreview(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(picked.type)) {
      input.value = "";
      setPreview(null);
      setLocalError("Choisissez une image JPEG, PNG ou WebP.");
      return;
    }
    setBusy(true);
    let file = picked;
    try {
      file = await downscale(picked);
      if (file !== picked) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      }
    } catch {
      // Navigateur sans createImageBitmap : l'image part telle quelle, le serveur la réduira.
    }
    setBusy(false);
    if (file.size > MAX_BYTES) {
      input.value = "";
      setPreview(null);
      setLocalError("Image trop lourde (8 Mo au maximum).");
      return;
    }
    setRemove(false);
    setPreview(URL.createObjectURL(file));
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setLocalError(null);
  }

  const shown = preview ?? (remove ? null : currentUrl);

  return (
    <div>
      <label htmlFor="image" className="kk-label">
        Image (facultatif)
      </label>
      {shown && (
        <div className="relative mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="Aperçu de l'image de l'article" className="w-full max-h-56 object-cover rounded-xl" />
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="text-sm max-w-full file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-bold file:cursor-pointer file:bg-[var(--kk-purple-light)] file:text-[var(--kk-purple-text)]"
          style={{ color: "var(--kk-mid)" }}
        />
        {preview && (
          <button type="button" onClick={clear} className="text-xs font-bold" style={{ color: "var(--kk-muted)" }}>
            Annuler
          </button>
        )}
      </div>
      {currentUrl && !preview && (
        <label className="flex items-center gap-2 text-xs font-semibold mt-2" style={{ color: "var(--kk-mid)" }}>
          <input type="checkbox" name="removeImage" checked={remove} onChange={(e) => setRemove(e.target.checked)} />
          Retirer l&apos;image actuelle
        </label>
      )}
      <p className="text-xs mt-1" style={{ color: "var(--kk-faint)" }}>
        {busy ? "Préparation de l'image…" : "Photo depuis votre ordinateur ou votre téléphone. JPEG, PNG ou WebP."}
      </p>
      {(localError || error) && <p className="kk-error mt-1">{localError ?? error}</p>}
    </div>
  );
}
