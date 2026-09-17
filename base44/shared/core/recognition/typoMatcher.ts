// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Typo & Fuzzy Matcher
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

/**
 * Calcule la distance de Damerau-Levenshtein (insertions, suppressions, substitutions, transpositions)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const al = a.length;
  const bl = b.length;
  const d: number[][] = [];

  for (let i = 0; i <= al; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= bl; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // suppression
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition adjacente (ex: revnue -> revenu)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[al][bl];
}

/**
 * Calcule la similarité entre deux chaînes (0.0 à 1.0)
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = stripAccents(a.toLowerCase().trim());
  const normB = stripAccents(b.toLowerCase().trim());

  if (normA === normB) return 1.0;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, Number((1 - dist / maxLen).toFixed(3)));
}

/**
 * Recherche le meilleur match flou parmi une liste de cibles
 * @param candidate Le mot ou groupe de mots soumis
 * @param targets Liste de termes cibles connus
 * @param threshold Seuil minimal de similarité (par défaut 0.78)
 */
export function findBestFuzzyMatch(
  candidate: string,
  targets: string[],
  threshold = 0.65
): { bestMatch: string; similarity: number; distance: number } | null {
  const normCand = stripAccents(candidate.toLowerCase().trim()).replace(/[^a-z0-9\s]/g, "");
  if (!normCand || normCand.length < 3) return null;

  let bestMatch = "";
  let highestSim = -1;
  let minDistance = 999;

  for (const target of targets) {
    const normTarget = stripAccents(target.toLowerCase().trim()).replace(/[^a-z0-9\s]/g, "");
    const dist = levenshteinDistance(normCand, normTarget);

    // Règle de tolérance max : 1 erreur pour mots <= 5 lettres, 2 erreurs pour mots plus longs
    const maxAllowedDist = normTarget.length <= 5 ? 1 : 2;
    if (dist <= maxAllowedDist) {
      const sim = 1 - dist / Math.max(normCand.length, normTarget.length);
      if (sim > highestSim && sim >= threshold) {
        highestSim = sim;
        bestMatch = target;
        minDistance = dist;
      }
    }
  }

  if (highestSim >= threshold) {
    return {
      bestMatch,
      similarity: Number(highestSim.toFixed(3)),
      distance: minDistance,
    };
  }

  return null;
}
