import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** "icon" = feuille seule, "full" = icône + mot-symbole */
  variant?: "icon" | "full";
  /** Pour variant="full" : mot-symbole à droite (nav) ou en dessous (écrans centrés) */
  layout?: "horizontal" | "vertical";
  /** Fond clair (vert/violet) ou fond foncé (blanc) */
  tone?: "color" | "white" | "black";
  /** Hauteur en pixels de l'icône (le mot-symbole suit proportionnellement) */
  size?: number;
  /** Enveloppe le logo dans un lien vers l'accueil */
  href?: string;
  className?: string;
};

const ICON_SRC: Record<"color" | "white" | "black", string> = {
  color: "/brand/icon-color.png",
  white: "/brand/icon-white.png",
  black: "/brand/icon-color.png",
};

const FULL_SRC: Record<"horizontal" | "vertical", Record<"color" | "white" | "black", string>> = {
  horizontal: {
    color: "/brand/logo-horizontal-color.png",
    white: "/brand/logo-horizontal-white.png",
    black: "/brand/logo-horizontal-black.png",
  },
  vertical: {
    color: "/brand/logo-vertical-color.png",
    white: "/brand/logo-vertical-white.png",
    black: "/brand/logo-vertical-black.png",
  },
};

const ICON_RATIO = 779 / 900; // largeur / hauteur du fichier icon-color.png
const FULL_RATIO: Record<"horizontal" | "vertical", number> = {
  horizontal: 900 / 266, // logo-horizontal-color.png
  vertical: 883 / 900, // logo-vertical-color.png
};

/**
 * Logo K-Kouma (guide de marque 2026).
 * `variant="icon"` = la feuille seule (avatar, favicon-like, espaces exigus).
 * `variant="full"` = feuille + mot-symbole "K-Kouma" (headers, footers, écrans d'auth).
 */
export function Logo({ variant = "full", layout = "horizontal", tone = "color", size = 32, href, className }: LogoProps) {
  const src = variant === "icon" ? ICON_SRC[tone] : FULL_SRC[layout][tone];
  const ratio = variant === "icon" ? ICON_RATIO : FULL_RATIO[layout];
  const height = size;
  const width = Math.round(height * ratio);

  const img = (
    <Image
      src={src}
      alt="K-Kouma"
      width={width}
      height={height}
      priority
      className={className}
      style={{ height, width: "auto" }}
    />
  );

  if (!href) return img;

  return (
    <Link href={href} className="inline-flex items-center shrink-0">
      {img}
    </Link>
  );
}
