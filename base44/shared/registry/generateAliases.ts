// GESCOP — Dérivation des tables legacy depuis le registre (spec v2, section 3)
//
// Fonctions pures, sans effet de bord : elles ne modifient aucun fichier.
// Chaque appelant (semanticMatcher.ts, importUtils.ts, contextualRecognition.ts)
// consomme ces fonctions AU CHARGEMENT DU MODULE plutôt que via un fichier
// généré et committé, pour qu'il soit structurellement impossible d'oublier de
// régénérer une table quand le registre change (c'est exactement ce qui a créé
// le bug "Facebook Ads" : ENUM_TRANSLATIONS savait déjà traduire "facebook ads"
// en valeur de cellule, FIELD_ALIASES n'a jamais reçu l'entrée d'en-tête
// correspondante, faute de source commune forçant les deux à se mettre à jour
// ensemble).

import { CONCEPTS, CATEGORIES } from "./conceptRegistry.ts";

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Doit rester equivalent a cleCanonique() dans base44/shared/importUtils.ts :
// c'est la forme sous laquelle ALIAS_CANONIQUES est indexee et sous laquelle
// normalizeKeys() cherche un en-tete de colonne a l'import reel. Duplique ici
// plutot qu'importe pour eviter un cycle (importUtils.ts consomme ce module).
function canonicalize(s: string): string {
  return normalizeKey(s)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Forme attendue par semanticMatcher.ts's CONCEPT_MAPPINGS. `type` liste tous
 * les types de colonne (dataProfiler.ts's ColumnProfile.inferredType) que ce
 * concept accepte, pas un seul — un montant peut être profilé "currency"
 * ("1 200,00 $"), "decimal" ("1200.50") ou "integer" ("1200") selon le
 * formatage source.
 */
export function buildConceptMappingsFromRegistry(): { concept: string; type: string[]; keywords: string[] }[] {
  const dataTypeToProfilerTypes: Record<string, string[]> = {
    CURRENCY: ["currency", "decimal", "integer"],
    PERCENTAGE: ["percentage", "decimal"],
    NUMBER: ["decimal", "integer"],
    INTEGER: ["integer", "decimal"],
    DATE: ["date"],
    STRING: ["string"],
  };
  return Object.values(CONCEPTS).map((c) => ({
    concept: c.conceptId,
    type: dataTypeToProfilerTypes[c.dataType] || ["string"],
    keywords: c.lexicon.map(normalizeKey),
  }));
}

/**
 * Forme attendue par ALIAS_CANONIQUES (la table d'alias indexee sous forme
 * canonique, cf. son propre commentaire dans importUtils.ts) : synonyme
 * canonicalise (accents retires, minuscule, non-alphanumerique -> "_") ->
 * canonicalKey. Ne couvre QUE les concepts de mesure du registre — n'ecrase
 * jamais les alias purement structurels (id, nom, statut...) maintenus a la
 * main dans importUtils.ts.
 */
export function buildFieldAliasesFromRegistry(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of Object.values(CONCEPTS)) {
    for (const syn of c.lexicon) {
      out[canonicalize(syn)] = c.canonicalKey;
    }
  }
  return out;
}

/**
 * Forme attendue par la tranche marketing_channel de ENUM_TRANSLATIONS :
 * valeur canonique -> liste de synonymes de VALEUR DE CELLULE.
 */
export function buildChannelEnumTranslations(): Record<string, string[]> {
  const cat = CATEGORIES.marketing_channel;
  const out: Record<string, string[]> = {};
  if (!cat) return out;
  for (const [canonical, synonyms] of Object.entries(cat.lexicon)) {
    out[canonical] = synonyms.map(normalizeKey);
  }
  return out;
}

/**
 * Remplace la chaîne if/else codée en dur de contextualRecognition.ts :
 * étant donné un nom de colonne déjà normalisé, retourne le concept le plus
 * fort si un synonyme du registre matche exactement.
 */
export function findConceptByHeaderName(
  normalizedHeaderName: string,
): { canonicalKey: string; semanticType: string; conceptId: string; score: number } | null {
  const normName = normalizeKey(normalizedHeaderName).replace(/[^a-z0-9]+/g, " ").trim();
  for (const c of Object.values(CONCEPTS)) {
    if (c.forbidden?.some((f) => normalizeKey(f) === normName)) continue;
    const hit = c.lexicon.some((syn) => normalizeKey(syn).replace(/[^a-z0-9]+/g, " ").trim() === normName);
    if (hit) {
      return { canonicalKey: c.canonicalKey, semanticType: c.kind.toLowerCase(), conceptId: c.conceptId, score: 0.9 };
    }
  }
  return null;
}
