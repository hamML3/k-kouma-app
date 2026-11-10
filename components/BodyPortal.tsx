'use client'

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

/**
 * Rend ses enfants directement dans <body>. Indispensable pour les tiroirs
 * `position: fixed` placés dans un en-tête qui a un `backdrop-filter` : ce
 * filtre fait de l'en-tête le repère des éléments fixes, si bien qu'un tiroir
 * « plein écran » serait réduit à la hauteur de l'en-tête et, une fois caché
 * hors champ, élargirait la page (défilement horizontal et page dézoomée sur
 * téléphone). Rien n'est rendu côté serveur : le tiroir est fermé au chargement.
 */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
