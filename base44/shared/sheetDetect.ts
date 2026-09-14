// Entity detection for imported sheets/files.
// Two independent strategies, because a sheet name alone misses a lot:
//   1. the sheet/file name,
//   2. the column headers (a signature of required fields).
// Also recovers the header row when a sheet starts with a title line, which
// otherwise yields __EMPTY columns and zero usable rows.

import * as XLSX from "npm:xlsx@0.18.5";
import { stripAccents, FIELD_ALIASES } from "./importUtils.ts";
import { ENTITY_SCHEMAS } from "./entitySchemas.ts";

const NAME_ENTITY_MAP = [
  { pattern: /campaign.*(daily|jour)|marketing.*(daily|jour)|(daily|jour).*campaign|campagne.*(jour|quotidien)/i, entity: "CampaignDaily" },
  { pattern: /interaction|service.?client|support|ticket/i, entity: "Interaction" },
  { pattern: /transaction|ecriture|grand.?livre|releve|bancaire/i, entity: "Transaction" },
  { pattern: /inventaire|inventory|stock/i, entity: "Inventory" },
  { pattern: /order|commande|vente|sale/i, entity: "Order" },
  { pattern: /customer|client|acheteur/i, entity: "Customer" },
  { pattern: /product|produit|article|catalogue|sku/i, entity: "Product" },
  { pattern: /supplier|fournisseur|vendor/i, entity: "Supplier" },
  { pattern: /purchase|achat|approvisionnement/i, entity: "Purchase" },
  { pattern: /campaign|campagne|publicite|ads|marketing/i, entity: "Campaign" },
  { pattern: /employee|employe|personnel|effectif|staff|rh/i, entity: "Employee" },
  { pattern: /payroll|paie|paye|salaire|remuneration/i, entity: "Payroll" },
  { pattern: /expense|depense|charge|frais|cout/i, entity: "Expense" },
  { pattern: /cashflow|cash.?flow|tresorerie|caisse|liquidite|flux/i, entity: "Cashflow" },
  { pattern: /competitor|concurrent|concurrence/i, entity: "Competitor" },
  { pattern: /signal|radar|veille|actualite/i, entity: "ExternalSignal" },
  { pattern: /goal|objectif|cible|target/i, entity: "Goal" },
  { pattern: /event|evenement|journal/i, entity: "Event" },
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
const HEADER_SIGNATURES: { entity: string; must: string[] }[] = [
  { entity: "CampaignDaily", must: ["campaign_id", "date"] },
  { entity: "Campaign", must: ["campaign_id"] },
  { entity: "Inventory", must: ["product_id", "closing_stock"] },
  { entity: "Inventory", must: ["product_id", "opening_stock"] },
  { entity: "Purchase", must: ["supplier_id", "product_id"] },
  { entity: "Order", must: ["order_id"] },
  { entity: "Customer", must: ["customer_id"] },
  { entity: "Product", must: ["product_id"] },
  { entity: "Supplier", must: ["supplier_id"] },
  { entity: "Payroll", must: ["employee_id", "period"] },
  { entity: "Employee", must: ["employee_id"] },
  { entity: "Cashflow", must: ["closing_cash"] },
  { entity: "Cashflow", must: ["cash_in", "cash_out"] },
  { entity: "Expense", must: ["expense_id"] },
  { entity: "Interaction", must: ["interaction_id"] },
  { entity: "Competitor", must: ["competitor_id"] },
  { entity: "Goal", must: ["goal_id"] },
  { entity: "Event", must: ["event_id"] },
  { entity: "Transaction", must: ["date", "amount", "type"] },
];

const HEADER_ALIASES: Record<string, string> = {
  "id_commande": "order_id", "commande_id": "order_id", "no_commande": "order_id",
  "id_client": "customer_id", "client_id": "customer_id",
  "id_produit": "product_id", "produit_id": "product_id",
  "id_fournisseur": "supplier_id", "fournisseur_id": "supplier_id",
  "id_employe": "employee_id", "employe_id": "employee_id",
  "id_campagne": "campaign_id", "campagne_id": "campaign_id",
  "id_depense": "expense_id", "depense_id": "expense_id",
  "montant": "amount", "date_operation": "date", "periode": "period",
  "stock_cloture": "closing_stock", "stock_final": "closing_stock",
  "stock_ouverture": "opening_stock", "stock_initial": "opening_stock",
  "solde_cloture": "closing_cash", "solde_final": "closing_cash",
  "encaissements": "cash_in", "decaissements": "cash_out",
  "entrees": "cash_in", "sorties": "cash_out",
};

function normalizeHeader(h: string): string {
  const raw = String(h || "").toLowerCase().trim();
  const base = stripAccents(raw).replace(/[\s\-.]+/g, "_");
  // The importer's own alias table is consulted too, so a column the import can
  // actually read ("catégorie", "montant_total") is also visible to detection.
  return HEADER_ALIASES[base] || FIELD_ALIASES[raw] || FIELD_ALIASES[base] || base;
}

/**
 * Last-resort detection: which entity do these columns describe best?
 *
 * The signatures above demand an exact key column ("order_id", "customer_id"…).
 * A perfectly importable export that names its columns differently, or has no id
 * column at all, matched nothing — the sheet was reported "Type non reconnu" and
 * zero rows were imported even though every other column lined up. This scores
 * each entity by how many of the file's columns it explains, and only accepts a
 * candidate whose required fields are all present, so the rows can actually be
 * stored rather than quarantined one by one.
 */
export function detectEntityByFieldOverlap(headers: string[]): string | null {
  const set = new Set((headers || []).map(normalizeHeader).filter(Boolean));
  if (set.size === 0) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const [entity, schema] of Object.entries(ENTITY_SCHEMAS)) {
    if (!(schema.required || []).every((r) => set.has(r))) continue;
    const fields = Object.keys(schema.properties).filter((f) => f !== "import_id");
    const matched = fields.filter((f) => set.has(f)).length;
    const coverage = matched / set.size;
    if (matched < 3 || coverage < 0.5) continue;
    const score = matched + coverage;
    if (score > bestScore) { bestScore = score; best = entity; }
  }
  return best;
}

/**
 * Les colonnes permettent-elles de stocker cette entite ?
 *
 * Le nom du fichier l'emportait sur les colonnes : un releve de transactions
 * appele "ventes.csv" partait en Order, ou order_id est obligatoire, et chaque
 * ligne etait mise en quarantaine. Le nom reste prioritaire, mais seulement
 * quand le fichier peut effectivement alimenter l'entite qu'il annonce.
 */
export function entiteCompatible(entity: string, headers: string[]): boolean {
  const schema = (ENTITY_SCHEMAS as Record<string, any>)[entity];
  if (!schema) return false;
  const set = new Set((headers || []).map(normalizeHeader).filter(Boolean));
  return (schema.required || []).every((r: string) => set.has(r));
}

export function detectEntityByHeaders(headers: string[]): string | null {
  const set = new Set((headers || []).map(normalizeHeader));
  for (const sig of HEADER_SIGNATURES) {
    if (sig.must.every((m) => set.has(m))) return sig.entity;
  }
  return null;
}

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