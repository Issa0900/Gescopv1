// GESCOP — Type MeasuredValue (spec v2, section 4)
//
// Aucune valeur métier ne doit circuler sous forme de nombre nu entre la
// validation et l'affichage : un nombre nu ne peut pas distinguer "mesuré à
// zéro" de "jamais mesuré", ce qui est la cause directe du bug "0 $ affiché
// BON". Ce fichier ne contient aucune syntaxe spécifique à Deno ou à un
// bundler ; les valeurs qu'il produit sont de simples objets, consommables
// sans étape de compilation depuis du .jsx/.js.

export type MeasurementLineage = {
  concept: string; // conceptId du registre, ex. "finance.revenue"
  sourceObservationId?: string;
  importId?: string;
  formula?: string; // pour une valeur dérivée/calculée
};

export type MissingReason = "NO_SOURCE" | "NOT_IMPORTED" | "QUARANTINED";

export type MeasuredValue<T = number> =
  | { status: "MEASURED"; value: T; lineage: MeasurementLineage }
  | { status: "NOT_MEASURED"; reason: MissingReason }
  | { status: "UNKNOWN" | "INVALID" | "NOT_APPLICABLE"; reason: string };

export function measured<T>(value: T, lineage: MeasurementLineage): MeasuredValue<T> {
  return { status: "MEASURED", value, lineage };
}

export function notMeasured(reason: MissingReason): MeasuredValue<never> {
  return { status: "NOT_MEASURED", reason };
}

export function invalidValue(reason: string): MeasuredValue<never> {
  return { status: "INVALID", reason };
}

export function isMeasured<T>(
  mv: MeasuredValue<T>,
): mv is { status: "MEASURED"; value: T; lineage: MeasurementLineage } {
  return mv.status === "MEASURED";
}

/**
 * Combine plusieurs MeasuredValue en une seule via `fn`. Remplace le pattern
 * `(deps.a || 0) + (deps.b || 0)` : si une seule dépendance n'est pas
 * MEASURED, le résultat est NOT_MEASURED (ou hérite du statut non-mesuré de
 * la première dépendance problématique) — jamais un calcul silencieux sur un
 * zéro inventé.
 */
export function combine(
  values: MeasuredValue<number>[],
  fn: (...nums: number[]) => number,
  lineage: MeasurementLineage,
): MeasuredValue<number> {
  for (const v of values) {
    if (!isMeasured(v)) {
      return v.status === "NOT_MEASURED" ? v : { status: "NOT_MEASURED", reason: "NO_SOURCE" };
    }
  }
  const nums = values.map((v) => (v as { status: "MEASURED"; value: number }).value);
  return measured(fn(...nums), lineage);
}

/**
 * Seul chemin sanctionné pour construire une ligne Observation à partir d'une
 * MeasuredValue (verrou applicatif au point d'écriture unique, spec section
 * 4 — approximation du CHECK SQL que le schéma Base44 ne peut pas exprimer).
 * Lève une erreur si `value` est présent sans status===MEASURED, ou l'inverse.
 */
export function toObservationPayload(
  mv: MeasuredValue<number>,
  meta: { observation_type: string; concept: string; source_id: string; entity_id?: string; unit?: string; date?: string },
): Record<string, unknown> {
  const base = { ...meta };
  if (mv.status === "MEASURED") {
    return { ...base, value: mv.value, status: "MEASURED" };
  }
  if ("value" in (mv as Record<string, unknown>)) {
    throw new Error("toObservationPayload: value present without status=MEASURED");
  }
  return { ...base, value: null, status: mv.status, reason: mv.reason };
}
