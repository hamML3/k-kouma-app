type Item = {
  label: string;
  value: number;
};

type HorizontalBarChartProps = {
  items: Item[];
  color: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
};

const defaultFormat = (n: number) => n.toLocaleString("fr-FR");

/**
 * Classement horizontal — une seule teinte (comparaison de magnitude par
 * catégorie, pas d'identité à distinguer), valeur affichée au bout de
 * chaque barre : liste courte et classée, contrairement à un nuage dense.
 */
export function HorizontalBarChart({ items, color, ariaLabel, formatValue = defaultFormat }: HorizontalBarChartProps) {
  const maxValue = Math.max(1, ...items.map((i) => i.value));
  const rowHeight = 32;
  const barThickness = 16;
  const width = 100; // pourcentage — barre en largeur fluide (%), hauteur fixe en px

  return (
    <div role="img" aria-label={ariaLabel} className="space-y-1">
      {items.map((item) => {
        const pct = Math.max(2, (item.value / maxValue) * 100);
        return (
          <div key={item.label} style={{ height: rowHeight }} className="flex items-center gap-3">
            <span
              className="text-xs font-semibold shrink-0 truncate"
              style={{ color: "var(--kk-mid)", width: 120 }}
              title={item.label}
            >
              {item.label}
            </span>
            <div className="flex-1 min-w-0" style={{ background: "#EDE8DC", borderRadius: 4, height: barThickness }}>
              <div
                style={{
                  width: `${pct}%`,
                  maxWidth: `${width}%`,
                  height: barThickness,
                  background: color,
                  borderRadius: 4,
                }}
                title={`${item.label} : ${formatValue(item.value)}`}
              />
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color: "var(--kk-dark)", width: 72, textAlign: "right" }}>
              {formatValue(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
