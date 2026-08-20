export const ICON_NAMES = [
  "globe",
  "check",
  "lock",
  "user",
  "family",
  "child",
  "anxiety",
  "overwhelm",
  "burnout",
  "energy",
  "puzzle",
  "self-care",
  "sleep",
  "chat",
  "chat-alt",
  "video",
  "journal",
  "headphones",
  "camera",
  "microphone",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  /** Retinte le pictogramme (par défaut vert sauge du fichier source) dans une autre couleur unie. */
  color?: string;
};

/** Pictogramme K-Kouma (jeu d'icônes du guide de marque 2026, ton vert sauge par défaut). */
export function Icon({ name, size = 20, className, color }: IconProps) {
  if (color) {
    // Recoloration via masque CSS : le SVG (mono-couleur) sert de pochoir.
    const mask = `url(/icons/${name}.svg) center / contain no-repeat`;
    return (
      <span
        role="img"
        aria-hidden="true"
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          backgroundColor: color,
          WebkitMask: mask,
          mask,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
