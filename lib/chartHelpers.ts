/** Les 6 derniers mois (le plus ancien en premier), au format "janv.", "févr." ... */
export function lastMonths(count: number): { key: string; label: string; start: Date; end: Date }[] {
  const now = new Date();
  const months: { key: string; label: string; start: Date; end: Date }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      start,
      end,
    });
  }

  return months;
}

/** Répartit une liste d'entrées datées dans les buckets mensuels de lastMonths(). */
export function bucketByMonth<T>(
  items: T[],
  getDate: (item: T) => Date,
  getValue: (item: T) => number,
  months: { start: Date; end: Date }[]
): number[] {
  return months.map(({ start, end }) =>
    items.reduce((sum, item) => {
      const d = getDate(item);
      return d >= start && d < end ? sum + getValue(item) : sum;
    }, 0)
  );
}
