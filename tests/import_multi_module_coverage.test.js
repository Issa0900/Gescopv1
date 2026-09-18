// Reproduit, colonne pour colonne, les 4 onglets du classeur de test réel qui
// échouaient à l'import (Marketing, Clientèle, Opérations/Achats, Trésorerie)
// avant les correctifs de importUtils.ts / entitySchemas.ts / Purchase.jsonc /
// entry.ts. Chaque test isole UNE cause de rejet diagnostiquée sur le fichier
// réel et prouve qu'elle ne bloque plus l'import, sans jamais assouplir la
// validation au point d'accepter une ligne réellement invalide.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRow, parseDate, deriveFallbackIdentity } from "../base44/shared/importUtils.ts";
import { getSchema } from "../base44/shared/entitySchemas.ts";
import { missingRequired } from "../base44/shared/bulkInsert.ts";

function importRow(entity, rawRow, index = 0) {
  const schema = getSchema(entity);
  const enumIssues = [];
  const unmapped = new Set();
  const normalized = normalizeRow(entity, rawRow, "test-import", schema.properties, "excel", enumIssues, unmapped);
  deriveFallbackIdentity(entity, normalized, index);
  const missing = missingRequired(normalized, schema.required);
  return { normalized, missing, enumIssues, unmapped };
}

test("parseDate lit un mois seul sans jour (export mensuel réel)", () => {
  assert.equal(parseDate("Janvier 2026"), "2026-01-01");
  assert.equal(parseDate("février 2025"), "2025-02-01");
  assert.equal(parseDate("Mars"), null, "un mois sans année reste illisible, ce n'est pas une régression à accepter");
});

test("Marketing (Campaign) : rollup mensuel par canal, sans campaign_id ni campaign_name", () => {
  // Représente l'état APRÈS résolution des en-têtes ("Campagne / Canal",
  // "Budget Publicitaire (€)"...) vers leurs champs cibles — cette
  // résolution passe par le plan d'import assisté par IA (analyserFichier/
  // appliquerPlan), hors périmètre d'un test déterministe. Ce test vise la
  // couche qui s'exécute APRÈS ce mapping : normalizeRow, parseDate,
  // deriveFallbackIdentity, missingRequired — exactement ce qui a été corrigé.
  const row = {
    channel: "Google Ads",
    date: "Janvier 2026", // tel que rendu par le plan avant coercion de type
    spend: 2500,
    impressions: 45000,
    conversions: 120,
    revenue: 10500,
    ctr: 0.042,
  };
  const { normalized, missing } = importRow("Campaign", row);

  assert.ok(missing.length === 0, `ne devrait plus manquer de champ requis, obtenu: ${missing}`);
  assert.ok(normalized.campaign_id, "un identifiant de repli doit être généré");
  assert.ok(normalized.campaign_name, "un nom de repli doit être généré");
  assert.match(normalized.campaign_name, /google_ads/, "le repli doit s'appuyer sur le canal réellement connu, pas un nom générique");
  assert.equal(normalized.spend, 2500);
  assert.equal(normalized.revenue, 10500, "le revenu doit atterrir sur le champ réel de Campaign (\"revenue\")");
  assert.ok(!("total_revenue" in normalized), "Campaign.jsonc n'a pas de champ total_revenue : il ne doit plus être écrit");
});

test("Marketing (Campaign) : une colonne revenu sans alias exact atterrit sur \"revenue\", pas sur un champ fantôme", () => {
  // Reproduit précisément le bug corrigé dans REVENUE_LANDING_FIELDS : une
  // colonne de la famille "revenu" (alias générique non déclaré par le
  // schéma Campaign) doit désormais choisir "revenue", le champ que
  // Campaign.jsonc déclare réellement — jamais "total_revenue", absent du
  // schéma, sur lequel elle atterrissait avant le correctif.
  const { normalized } = importRow("Campaign", { "Chiffre d'affaires": 8000, channel: "Email", date: "2026-01-01" });
  assert.equal(normalized.revenue, 8000);
  assert.ok(!("total_revenue" in normalized));
});

test("Trésorerie (Cashflow) : période \"Mois AAAA\" sans jour", () => {
  const row = {
    "Mois": "Janvier 2025",
    "Créances Clients (€)": 38000,
    "Dettes Fournisseurs (€)": 25000,
    "BFR (€)": "",
  };
  const { normalized, missing } = importRow("Cashflow", row);
  assert.equal(normalized.date, "2025-01-01");
  assert.deepEqual(missing, [], "la date ne doit plus être signalée comme manquante");
  assert.equal(normalized.accounts_receivable, 38000);
  assert.equal(normalized.accounts_payable, 25000);
});

test("Clientèle (Customer) : segment \"Occasionnel\" absent de l'enum mais courant en FR", () => {
  const row = { "ID Client": "CLI-806", "Segment": "Occasionnel", "Taux Abandon Panier (%)": 0.5 };
  const { normalized, missing, enumIssues } = importRow("Customer", row);
  assert.deepEqual(missing, []);
  assert.deepEqual(enumIssues, [], "Occasionnel doit être reconnu, pas rejeté comme valeur d'enum invalide");
  assert.equal(normalized.segment, "regulier");
});

test("Achats (Purchase) : export au niveau bon de commande, sans ligne produit", () => {
  // order_id/supplier_id/status : tel que rendu après résolution des
  // en-têtes ("ID Commande", "Fournisseur", "Statut Commande") par le plan
  // d'import — cf. le test Marketing ci-dessus pour la même remarque.
  const row = { order_id: "CMD-5001", supplier_id: "SUP-ALPHA", status: "received" };
  // Aucune colonne "date" dans ce fichier réel : la ligne doit rester en
  // quarantaine pour CETTE raison (une commande sans date n'est pas
  // exploitable), mais plus jamais pour product_id.
  const { normalized, missing } = importRow("Purchase", row);
  assert.equal(normalized.status, "recu", "l'anglais \"received\" doit se traduire en \"recu\" (ENUM_TRANSLATIONS)");
  assert.deepEqual(missing, ["date"], "product_id ne doit plus être exigé ; seule l'absence réelle de date doit rester bloquante");

  // Avec une date, la ligne doit désormais passer sans product_id.
  const withDate = importRow("Purchase", { ...row, date: "2026-01-05" });
  assert.deepEqual(withDate.missing, []);
});

test("Régression : une ligne Achats sans fournisseur reste bloquée (le garde-fou n'est pas devenu laxiste)", () => {
  const { missing } = importRow("Purchase", { date: "2026-01-05", status: "recu" });
  assert.deepEqual(missing, ["supplier_id"]);
});
