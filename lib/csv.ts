/**
 * Construction manuelle de CSV (RFC 4180, sans dépendance) pour les exports
 * admin. Un champ est entre guillemets dès qu'il contient une virgule, un
 * guillemet ou un retour à la ligne ; les guillemets internes sont doublés.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvField).join(","));
  return lines.join("\r\n");
}

function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Réponse CSV téléchargeable — BOM UTF-8 inclus pour qu'Excel affiche
 * correctement les accents (les admins l'ouvrent typiquement dans Excel).
 */
export function csvResponseInit(filename: string): ResponseInit {
  return {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  };
}

export const CSV_BOM = "﻿";
