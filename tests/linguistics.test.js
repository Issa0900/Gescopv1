import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHeader, stripAccents } from "../base44/shared/core/recognition/normalizer.ts";
import { tokenizeHeader, generateNGrams } from "../base44/shared/core/recognition/tokenizer.ts";
import { detectLanguage } from "../base44/shared/core/recognition/languageDetector.ts";
import { resolveAbbreviation } from "../base44/shared/core/recognition/abbreviationEngine.ts";
import { findBestFuzzyMatch, levenshteinDistance } from "../base44/shared/core/recognition/typoMatcher.ts";

test("Linguistique - Normalisation d'En-tête & Préservation du Brut", () => {
  const res1 = normalizeHeader("Chiffre d'Affaires ($)");
  assert.equal(res1.rawHeader, "Chiffre d'Affaires ($)");
  assert.equal(res1.cleanText, "chiffre d affaires");
  assert.equal(res1.extractedCurrency, "CURRENCY");
  assert.equal(res1.isPercentage, false);

  const res2 = normalizeHeader("Gross Margin (%)");
  assert.equal(res2.cleanText, "gross margin");
  assert.equal(res2.extractedUnit, "%");
  assert.equal(res2.isPercentage, true);

  const res3 = normalizeHeader("delai_livraison (jours)");
  assert.equal(res3.cleanText, "delai livraison");
  assert.equal(res3.extractedUnit, "days");
});

test("Linguistique - Tokenisation Intelligente (camelCase, PascalCase, snake, kebab)", () => {
  // 1. camelCase
  const t1 = tokenizeHeader("customerLifetimeValue");
  assert.deepEqual(t1, ["customer", "lifetime", "value"]);

  // 2. PascalCase
  const t2 = tokenizeHeader("GrossMargin");
  assert.deepEqual(t2, ["gross", "margin"]);

  // 3. snake_case
  const t3 = tokenizeHeader("avg_order_value");
  assert.deepEqual(t3, ["avg", "order", "value"]);

  // 4. kebab-case
  const t4 = tokenizeHeader("net-sales-volume");
  assert.deepEqual(t4, ["net", "sales", "volume"]);

  // 5. Acronyme collé
  const t5 = tokenizeHeader("orderID");
  assert.deepEqual(t5, ["order", "id"]);

  const t6 = tokenizeHeader("AOVAmount");
  assert.deepEqual(t6, ["aov", "amount"]);
});

test("Linguistique - Détection Automatique de Langue", () => {
  assert.equal(detectLanguage("chiffre d'affaires et commandes").language, "fr");
  assert.equal(detectLanguage("net revenue and customer orders").language, "en");
  assert.equal(detectLanguage("ingresos netos y pedidos de clientes").language, "es");
  assert.equal(detectLanguage("receita liquida e pedidos dos clientes").language, "pt");
  assert.equal(detectLanguage("nettoumsatz und bestellungen").language, "de");
  assert.equal(detectLanguage("ricavi netti e ordini dei clienti").language, "it");
  assert.equal(detectLanguage("netto omzet en bestellingen").language, "nl");
});

test("Linguistique - Registre d'Abréviations et Désambiguïsation Contextuelle", () => {
  // 1. Abréviations directes
  const ca = resolveAbbreviation("CA");
  assert.equal(ca?.conceptId, "sales.revenue.net");

  const mb = resolveAbbreviation("MB");
  assert.equal(mb?.conceptId, "finance.profit.gross");

  const aov = resolveAbbreviation("AOV");
  assert.equal(aov?.conceptId, "sales.order.aov");

  const roas = resolveAbbreviation("ROAS");
  assert.equal(roas?.conceptId, "marketing.metrics.roas");

  // 2. Désambiguïsation contextuelle pour 'AR'
  // Sans contexte : basse confiance
  const arNeutral = resolveAbbreviation("AR", ["table_1", "col_2"]);
  assert.equal(arNeutral?.conceptId, "treasury.working_capital.receivables");
  assert.ok((arNeutral?.confidence || 0) < 0.7);

  // Avec contexte de facturation/créances : haute confiance
  const arContext = resolveAbbreviation("AR", ["invoice_id", "customer_name", "balance"]);
  assert.equal(arContext?.conceptId, "treasury.working_capital.receivables");
  assert.ok((arContext?.confidence || 0) >= 0.9);
});

test("Linguistique - Tolérance aux Fautes de Frappe (Fuzzy Matching)", () => {
  const targets = ["revenu", "chiffre d'affaires", "quantite", "commandes"];

  // 1. Faute courante sur revenu
  const m1 = findBestFuzzyMatch("revennus", targets);
  assert.equal(m1?.bestMatch, "revenu");

  const m2 = findBestFuzzyMatch("revnue", targets);
  assert.equal(m2?.bestMatch, "revenu");

  // 2. Faute sur quantite
  const m3 = findBestFuzzyMatch("quatite", targets);
  assert.equal(m3?.bestMatch, "quantite");

  const m4 = findBestFuzzyMatch("quantiy", targets);
  assert.equal(m4?.bestMatch, "quantite");
});

