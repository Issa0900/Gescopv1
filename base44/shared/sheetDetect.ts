// Entity detection for imported sheets/files.
// Two independent strategies, because a sheet name alone misses a lot:
//   1. the sheet/file name,
//   2. the column headers (a signature of required fields).
// Also recovers the header row when a sheet starts with a title line, which
// otherwise yields __EMPTY columns and zero usable rows.

import * as XLSX from "npm:xlsx@0.18.5";
import { stripAccents } from "./importUtils.ts";

const NAME_ENTITY_MAP = [
  { pattern: /campaign.*(daily|jour)|marketing.*(daily|jour)|(daily|jour).*campaign|campagne.*(jour|quotidien)/i, entity: "CampaignDaily" },
  { pattern: /interaction|service.?client|support|ticket/i, entity: "Interaction" },
  { pattern: /order|commande|vente|sale/i, entity: "Order" },
  { pattern: /transaction|ecriture|grand.?livre|releve|bancaire/i, entity: "Transaction" },
  { pattern: /inventaire|inventory|stock/i, entity: "Inventory" },
  { pattern: /customer|client|acheteur/i, entity: "Customer" },
  { pattern: /product|produit|article|catalogue|sku/i, entity: "Product" },
  { pattern: /purchase|achat|approvisionnement/i, entity: "Purchase" },
  { pattern: /supplier|fournisseur|vendor/i, entity: "Supplier" },
  { pattern: /campaign|campagne|publicite|ads|marketing/i, entity: "Campaign" },
  { pattern: /employee|employe|personnel|effectif|staff|rh/i, entity: "Employee" },
  { pattern: /payroll|paie|paye|salaire|remuneration/i, entity: "Payroll" },
  { pattern: /expense|depense|charge|frais|cout/i, entity: "Expense" },
  { pattern: /cashflow|cash.?flow|tresorerie|caisse|liquidite|flux/i, entity: "Cashflow" },
  { pattern: /competitor|concurrent|concurrence/i, entity: "Competitor" },
  { pattern: /signal|radar|veille|actualite/i, entity: "ExternalSignal" },
  { pattern: /goal|objectif|cible|target/i, entity: "Goal" },
  { pattern: /event|evenement|journal/i, entity: "Event" },
  { pattern: /immobilisation|actif|asset/i, entity: "Asset" },
  { pattern: /sommaire.*executif|executive.*summary|tableau.*bord.*executif/i, entity: "ExecutiveSummary" },
];

export function detectEntityByName(name: string): string | null {
  const lower = stripAccents((name || "").toLowerCase());
  for (const m of NAME_ENTITY_MAP) {
    if (m.pattern.test(lower)) return m.entity;
  }
  return null;
}

// Header signatures: every "must" column has to be present. Ordered from the
// most specific signature to the least, so CampaignDaily wins over Campaign.
// Detection par en-tetes deplacee vers importUtils.ts (18 sept 2026) : ces
// fonctions sont pures (aucune dependance a XLSX), contrairement au reste de
// ce fichier — les y laisser empechait de les tester sous le test runner Node
// du repo (npm:xlsx@0.18.5 n'est resolvable que sous Deno), exactement le
// probleme deja rencontre avec deriveFallbackIdentity. Re-exportees ici pour
// ne rien casser chez les appelants existants.
export {
  detectEntityByFieldOverlap,
  entiteCompatible,
  detectEntityByHeaders,
} from "./importUtils.ts";

/**
 * Une cellule ressemble-t-elle a un libelle de colonne ?
 *
 * Un libelle est du texte qui ne se lit ni comme un nombre ("1 000,00 $",
 * "(500)", "12 %") ni comme une date ("2026-03-01", "01/03/2026"). Le test
 * reste volontairement grossier et local : il ne sert qu'a reperer la ligne
 * d'en-tetes, pas a valider une valeur — c'est le role de importUtils, qui
 * importe deja ce module et ne peut donc pas etre importe en retour.
 */
const RESSEMBLE_A_UN_NOMBRE = /^[(+-]?[\d\s.,'\u2019\u00a0]+[\s%$\u20ac\u00a3\u00a5)]*$/;
const RESSEMBLE_A_UNE_DATE = /^\d{1,4}[\/\-.]\d{1,2}([\/\-.]\d{1,4})?([T\s].*)?$/;

function estLibelle(cellule: any): boolean {
  if (typeof cellule !== "string") return false;
  const t = cellule.trim();
  if (t === "") return false;
  if (RESSEMBLE_A_UN_NOMBRE.test(t)) return false;
  if (RESSEMBLE_A_UNE_DATE.test(t)) return false;
  return true;
}

/**
 * Index de la ligne qui porte les intitules de colonnes.
 *
 * C'est celle qui contient le plus de LIBELLES — du texte qui n'est ni un
 * nombre ni une date. Compter simplement les cellules de type chaine ne suffit
 * pas : un fichier texte est lu sans conversion (voir csvParse.ts, raw: true),
 * donc toutes les cellules sont des chaines et une ligne de donnees ayant une
 * colonne de plus que l'en-tete l'emportait.
 *
 * Exporte parce que le plan de lecture de secours (importPlan.ts) en a besoin
 * quand l'analyse par IA n'est pas disponible.
 */
export function trouverLigneEntetes(matrix: any[][]): number {
  let headerIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(matrix.length, 10); i += 1) {
    const row = matrix[i] || [];
    const filled = row.filter((c) => String(c ?? "").trim() !== "").length;
    const libelles = row.filter((c) => estLibelle(c)).length;
    // Les libelles pesent double : c'est le signe distinctif d'un en-tete,
    // le remplissage ne departage que des lignes egales par ailleurs.
    const score = filled >= 2 ? libelles * 2 + filled : -1;
    // `>` strict : a egalite, la ligne la plus haute gagne, donc l'en-tete
    // plutot que la premiere ligne de donnees qui lui ressemblerait.
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  return headerIdx;
}

/**
 * Rows of a sheet, with header-row recovery.
 * A sheet whose first line is a title produces __EMPTY_1, __EMPTY_2… headers;
 * in that case we scan the first rows for the real header line.
 */
export function sheetRows(sheet: any): { rows: Record<string, any>[]; headers: string[] } {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as any[][];
  if (matrix.length === 0) return { rows: [], headers: [] };

  const headerIdx = trouverLigneEntetes(matrix);

  const headers = (matrix[headerIdx] || []).map((h, i) => (String(h ?? "").trim() || `col_${i + 1}`));
  const rows: Record<string, any>[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] || [];
    if (raw.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => { obj[h] = raw[idx] ?? ""; });
    rows.push(obj);
  }
  return { rows, headers };
}