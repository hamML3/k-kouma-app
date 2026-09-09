type Series = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type BarChartProps = {
  /** Étiquettes de l'axe X, une par colonne (ex: mois). */
  categories: string[];
  /** 1 série = pas de légende (le titre du graphique suffit) ; 2 séries = légende + groupage. */
  series: Series[];
  ariaLabel: string;
  formatValue?: (n: number) => string;
  height?: number;
};

const defaultFormat = (n: number) => n.toLocaleString("fr-FR");

/** Chemin d'une barre à coins arrondis en haut seulement, carrée à la base. */
function roundedTopBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h);
  if (h <= 0) return "";
  if (radius <= 0) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
  return `M${x},${y + h}
    L${x},${y + radius}
    Q${x},${y} ${x + radius},${y}
    L${x + w - radius},${y}
    Q${x + w},${y} ${x + w},${y + radius}
    L${x + w},${y + h}
    Z`;
}

/**
 * Graphique en barres — SVG pur, rendu côté serveur (aucun JS nécessaire).
 * Une seule teinte par série ; ordre fixe (jamais recalculé selon la valeur).
 * L'info-bulle native (<title>) donne la valeur exacte au survol.
 */
export function BarChart({ categories, series, ariaLabel, formatValue = defaultFormat, height = 220 }: BarChartProps) {
  const width = 640;
  const marginLeft = 52;
  const marginBottom = 28;
  const marginTop = series.length > 1 ? 32 : 16;
  const marginRight = 12;

  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
  // Arrondit le plafond de l'axe à un multiple "propre"
  const niceMax = (() => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
    const step = magnitude / 2;
    return Math.ceil(maxValue / step) * step || 1;
  })();

  // Dédoublonne après arrondi : avec peu de données, plusieurs graduations
  // peuvent arrondir à la même valeur (ex: niceMax=1 → 0, 0, 1, 1, 1).
  const ticks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f))));
  const yScale = (v: number) => plotH - (v / niceMax) * plotH;

  const groupWidth = plotW / categories.length;
  const barGap = 2;
  const barWidth = Math.min(24, (groupWidth - barGap * (series.length + 1)) / series.length);
  const groupInnerWidth = barWidth * series.length + barGap * (series.length - 1);

  const lastIndex = categories.length - 1;

  return (
    <div>
      {series.length > 1 && (
        <div className="flex items-center gap-4 mb-2 flex-wrap">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--kk-mid)" }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full h-auto"
        style={{ maxHeight: height }}
      >
        <g transform={`translate(${marginLeft},${marginTop})`}>
          {/* Gridlines + y labels */}
          {ticks.map((t, ti) => (
            <g key={ti}>
              <line
                x1={0}
                x2={plotW}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="#EDE8DC"
                strokeWidth={1}
              />
              <text
                x={-8}
                y={yScale(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--kk-faint)"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {categories.map((cat, i) => {
            const groupX = i * groupWidth + (groupWidth - groupInnerWidth) / 2;
            return (
              <g key={cat}>
                {series.map((s, si) => {
                  const value = s.values[i] ?? 0;
                  const barH = plotH - yScale(value);
                  const barX = groupX + si * (barWidth + barGap);
                  const barY = yScale(value);
                  return (
                    <path key={s.key} d={roundedTopBarPath(barX, barY, barWidth, barH, 4)} fill={s.color}>
                      <title>{`${cat} · ${s.label} : ${formatValue(value)}`}</title>
                    </path>
                  );
                })}
                {/* Étiquette directe sur la dernière colonne uniquement (sélectif, pas sur chaque barre) */}
                {i === lastIndex &&
                  series.map((s, si) => {
                    const value = s.values[i] ?? 0;
                    if (value <= 0) return null;
                    const barX = groupX + si * (barWidth + barGap);
                    const barY = yScale(value);
                    return (
                      <text
                        key={s.key}
                        x={barX + barWidth / 2}
                        y={barY - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={700}
                        fill="var(--kk-dark)"
                      >
                        {formatValue(value)}
                      </text>
                    );
                  })}
                <text
                  x={groupX + groupInnerWidth / 2}
                  y={plotH + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--kk-muted)"
                >
                  {cat}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="#D8D2C4" strokeWidth={1} />
        </g>
      </svg>
    </div>
  );
}
