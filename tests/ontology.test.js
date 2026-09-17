import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CONCEPTS,
  Registry,
  AGGREGATION_TYPES,
  BUSINESS_ROLES,
  LOGICAL_TYPES,
} from "../base44/shared/core/ontology/index.ts";

test("Ontologie - Intégrité et Unicité des Concepts", () => {
  const all = Registry.getAllConcepts();
  assert.ok(all.length >= 25, `Devrait contenir au moins 25 concepts fondamentaux, trouvé: ${all.length}`);

  const ids = new Set();
  for (const c of all) {
    assert.ok(c.conceptId, "Chaque concept doit avoir un conceptId");
    assert.ok(c.canonicalName, `Concept ${c.conceptId} doit avoir un canonicalName`);
    assert.ok(!ids.has(c.conceptId), `conceptId en double détecté : ${c.conceptId}`);
    ids.add(c.conceptId);

    assert.ok(c.domain, `Concept ${c.conceptId} doit avoir un domain`);
    assert.ok(c.nature, `Concept ${c.conceptId} doit avoir une nature`);
    assert.ok(c.businessRole, `Concept ${c.conceptId} doit avoir un businessRole`);
    assert.ok(c.physicalType, `Concept ${c.conceptId} doit avoir un physicalType`);
    assert.ok(c.logicalType, `Concept ${c.conceptId} doit avoir un logicalType`);
    assert.ok(c.grain, `Concept ${c.conceptId} doit avoir un grain`);
    assert.ok(Array.isArray(c.allowedAggregations), `allowedAggregations doit être un tableau pour ${c.conceptId}`);
  }
});

test("Ontologie - Interdictions d'Opérations Analytiques (Règles Métier GESCOP)", () => {
  // 1. Les identifiants ne doivent jamais être sommés ni moyennés
  const customerId = Registry.getConcept("customers.identity.id");
  assert.ok(customerId);
  assert.ok(customerId.forbiddenOperations?.includes("SUM"), "SUM interdit sur customer_id");
  assert.ok(customerId.forbiddenOperations?.includes("AVG"), "AVG interdit sur customer_id");
  assert.ok(customerId.allowedAggregations.includes(AGGREGATION_TYPES.COUNT_DISTINCT));

  // 2. Les soldes instantanés (closing_cash) ne doivent pas être sommés sur le temps
  const closingCash = Registry.getConcept("treasury.cash.closing");
  assert.ok(closingCash);
  assert.ok(closingCash.forbiddenOperations?.includes("SUM"), "SUM interdit sur solde de trésorerie");
  assert.equal(closingCash.businessRole, BUSINESS_ROLES.STOCK);

  // 3. Les flux (ventes, charges) sont sommables
  const netRev = Registry.getConcept("sales.revenue.net");
  assert.ok(netRev);
  assert.ok(netRev.allowedAggregations.includes(AGGREGATION_TYPES.SUM));
  assert.equal(netRev.businessRole, BUSINESS_ROLES.FLOW);
});

test("Ontologie - Couverture Multilingue (7 Langues)", () => {
  // Vérification de la recherche multilingue pour sales.revenue.net
  const fr = Registry.findBySynonym("chiffre d'affaires net");
  assert.ok(fr.some((c) => c.conceptId === "sales.revenue.net"), "FR: chiffre d'affaires net");

  const en = Registry.findBySynonym("net sales");
  assert.ok(en.some((c) => c.conceptId === "sales.revenue.net"), "EN: net sales");

  const es = Registry.findBySynonym("ingresos netos");
  assert.ok(es.some((c) => c.conceptId === "sales.revenue.net"), "ES: ingresos netos");

  const pt = Registry.findBySynonym("receita liquida");
  assert.ok(pt.some((c) => c.conceptId === "sales.revenue.net"), "PT: receita liquida");

  const de = Registry.findBySynonym("nettoumsatz");
  assert.ok(de.some((c) => c.conceptId === "sales.revenue.net"), "DE: nettoumsatz");

  const it = Registry.findBySynonym("ricavi netti");
  assert.ok(it.some((c) => c.conceptId === "sales.revenue.net"), "IT: ricavi netti");

  const nl = Registry.findBySynonym("netto omzet");
  assert.ok(nl.some((c) => c.conceptId === "sales.revenue.net"), "NL: netto omzet");
});

test("Ontologie - Distinction des 4 Flux de Trésorerie", () => {
  const opening = Registry.getConcept("treasury.cash.opening");
  const inflow = Registry.getConcept("treasury.cash.inflow");
  const outflow = Registry.getConcept("treasury.cash.outflow");
  const closing = Registry.getConcept("treasury.cash.closing");

  assert.ok(opening && inflow && outflow && closing, "Les 4 concepts de trésorerie doivent exister");
  assert.notEqual(opening.conceptId, closing.conceptId);
  assert.notEqual(inflow.conceptId, outflow.conceptId);
  assert.equal(opening.businessRole, BUSINESS_ROLES.STOCK);
  assert.equal(closing.businessRole, BUSINESS_ROLES.STOCK);
  assert.equal(inflow.businessRole, BUSINESS_ROLES.FLOW);
  assert.equal(outflow.businessRole, BUSINESS_ROLES.FLOW);
});

test("Ontologie - Distinction Stricte gross_profit ($) vs gross_margin (%)", () => {
  const grossProfit = Registry.getConcept("finance.profit.gross");
  const grossMargin = Registry.getConcept("finance.margin.gross_rate");

  assert.ok(grossProfit && grossMargin);
  assert.equal(grossProfit.logicalType, LOGICAL_TYPES.CURRENCY, "Gross profit est en devise ($)");
  assert.equal(grossMargin.logicalType, LOGICAL_TYPES.PERCENTAGE, "Gross margin est en pourcentage (%)");
  assert.ok(grossProfit.negativeTerms?.includes("percent") || grossProfit.negativeTerms?.includes("%"));
  assert.ok(grossMargin.negativeTerms?.includes("montant") || grossMargin.negativeTerms?.includes("amount"));
});

test("Ontologie - Liaison aux Entités Base44", () => {
  const orderTotal = Registry.getConceptForEntityField("Order", "total");
  assert.equal(orderTotal?.conceptId, "sales.revenue.net");

  const cashClosing = Registry.getConceptForEntityField("Cashflow", "closing_cash");
  assert.equal(cashClosing?.conceptId, "treasury.cash.closing");

  const customerId = Registry.getConceptForEntityField("Customer", "customer_id");
  assert.equal(customerId?.conceptId, "customers.identity.id");
});

