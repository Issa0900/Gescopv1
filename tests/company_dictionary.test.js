// Phase 1 du chantier "reconnaissance universelle" : le dictionnaire
// d'entreprise (Company.company_dictionary) doit être consulté à l'import,
// AVANT les tables génériques, pour qu'un mot jamais vu ailleurs — propre au
// jargon d'une PME précise — soit reconnu dès la première correction et ne
// redemande plus jamais la même chose.
//
// Chaque test ci-dessous simule une PME fictive différente, avec des
// en-têtes qu'aucune table générique (FIELD_ALIASES, ENUM_TRANSLATIONS) ne
// connaît — la preuve que la reconnaissance vient bien du dictionnaire et de
// rien d'autre.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRow, buildCompanyDictionaryIndex, detectEntityByHeaders } from "../base44/shared/importUtils.ts";
import { getSchema } from "../base44/shared/entitySchemas.ts";
import { missingRequired } from "../base44/shared/bulkInsert.ts";

function importRow(entity, rawRow, companyDictRaw) {
  const schema = getSchema(entity);
  const dict = buildCompanyDictionaryIndex(companyDictRaw);
  const enumIssues = [];
  const unmapped = new Set();
  const normalized = normalizeRow(entity, rawRow, "test-import", schema.properties, "excel", enumIssues, unmapped, dict);
  const missing = missingRequired(normalized, schema.required);
  return { normalized, missing, unmapped };
}

test("buildCompanyDictionaryIndex normalise les clés comme cleCanonique (accents, casse, ponctuation)", () => {
  const idx = buildCompanyDictionaryIndex({ "Réf. Vte": "order_id", "  Client N°  ": "customer_id" });
  assert.equal(idx["ref_vte"], "order_id");
  assert.equal(idx["client_n"], "customer_id");
});

test("PME fictive « Atelier Boréal » : identifiant de vente maison, inconnu de toute table générique", () => {
  // "Réf. Vte" n'existe dans aucun alias générique — sans dictionnaire, cette
  // colonne resterait non mappée et order_id manquerait sur 100% des lignes.
  const dict = { "Réf. Vte": "order_id", "Client N°": "customer_id" };
  const row = { "Réf. Vte": "AB-2201", "Client N°": "CLI-77", date: "2026-02-01" };
  const { normalized, missing } = importRow("Order", row, dict);
  assert.equal(normalized.order_id, "AB-2201");
  assert.equal(normalized.customer_id, "CLI-77");
  assert.deepEqual(missing, []);
});

test("PME fictive « Verrerie Lumina » : la colonne du dictionnaire ne matche même pas la casse/accents habituels", () => {
  const dict = { "NUMÉRO DE COMMANDE INTERNE": "order_id" };
  const row = { "numero de commande interne": "LUM-0099", date: "2026-03-01" };
  const { normalized, missing } = importRow("Order", row, dict);
  assert.equal(normalized.order_id, "LUM-0099");
  assert.deepEqual(missing, []);
});

test("PME fictive « Nordik PleinAir » (cas réel) : dictionnaire même effet que le repli générique transaction_id→order_id", () => {
  // Confirme que la Phase 1 (dictionnaire) et le repli générique déjà en
  // place (session précédente) donnent le même résultat pour ce cas réel —
  // le dictionnaire doit fonctionner MÊME SANS le repli générique, pour un
  // terme qui n'aurait pas eu la chance d'être ajouté au code.
  const dict = { "Réf. Vente Interne": "order_id" };
  const row = { "Réf. Vente Interne": "V-10002", date: 45658, customer_id: "C-88021" };
  const { normalized, missing } = importRow("Order", row, dict);
  assert.equal(normalized.order_id, "V-10002");
  assert.deepEqual(missing, []);
});

test("Le dictionnaire peut pointer vers un concept générique (pas un nom de champ littéral) : le repli existant prend le relais", () => {
  // "Recette Boutique" -> "revenue" : Campaign n'a pas de champ "revenue"...
  // si, justement il en a un (voir session précédente) ; ce test vérifie que
  // la résolution passe bien par la même chaîne de repli que FIELD_ALIASES,
  // pas un chemin séparé et divergent.
  const dict = { "Recette Boutique": "revenue" };
  const row = { "Recette Boutique": 4200, channel: "email", date: "2026-01-01" };
  const { normalized } = importRow("Campaign", row, dict);
  assert.equal(normalized.revenue, 4200);
  assert.ok(!("total_revenue" in normalized), "ne doit pas créer de champ fantôme absent du schéma");
});

test("Un vrai champ du schéma garde toujours la priorité sur le dictionnaire (le dictionnaire ne doit jamais faire régresser un cas qui marchait déjà)", () => {
  const dict = { "order_id": "customer_id" }; // entrée absurde, volontairement piégeuse
  const row = { order_id: "CMD-1", date: "2026-01-01" };
  const { normalized } = importRow("Order", row, dict);
  assert.equal(normalized.order_id, "CMD-1", "une colonne déjà nommée exactement comme le champ ne doit jamais être détournée par le dictionnaire");
});

test("Phase 2 — PME fictive « Menuiserie du Fjord » : détection de FEUILLE (pas juste de colonne) via le dictionnaire", () => {
  // Aucune colonne ne s'appelle "order_id" ni aucun synonyme générique connu :
  // sans dictionnaire, cette feuille resterait "Type non reconnu" quelle que
  // soit la qualité du mapping de colonnes individuel.
  const headers = ["Réf. Vte", "Client N°", "Date"];
  const dict = buildCompanyDictionaryIndex({ "Réf. Vte": "order_id", "Client N°": "customer_id" });
  assert.equal(detectEntityByHeaders(headers, undefined), null, "sans dictionnaire, la feuille ne doit toujours pas être reconnue (pas de faux souvenir)");
  assert.equal(detectEntityByHeaders(headers, dict), "Order", "avec le dictionnaire, la feuille doit être reconnue comme Order");
});

test("Dictionnaire vide ou absent : comportement inchangé (pas de régression sur les entreprises sans dictionnaire)", () => {
  const row = { order_id: "CMD-2", date: "2026-01-01" };
  const withEmpty = importRow("Order", row, {});
  const withUndefined = importRow("Order", row, undefined);
  assert.deepEqual(withEmpty.normalized, withUndefined.normalized);
});
