import test from "node:test";
import assert from "node:assert/strict";
import { profileValues } from "../base44/shared/core/recognition/valueProfiler.ts";
import { extractUnit } from "../base44/shared/core/recognition/unitEngine.ts";
import { analyzeContext, disambiguateGenericAmount } from "../base44/shared/core/recognition/contextEngine.ts";
import { evaluateContradictions } from "../base44/shared/core/recognition/contradictionEngine.ts";
import { scoreCandidate } from "../base44/shared/core/recognition/scoringEngine.ts";

test("Profilage de Valeurs - Distinction RATING vs CURRENCY", () => {
  // 1. Valeurs entre 1 et 5 avec en-tête rating
  const pRating = profileValues([4.5, 4.0, 3.8, 4.9, 5.0], "customer_rating");
  assert.equal(pRating.detectedLogicalType, "RATING", "Doit être classé en RATING et non CURRENCY");
  assert.equal(pRating.isRatingCandidate, true);
  assert.ok(pRating.confidence >= 0.9);

  // 2. Montants monétaires
  const pCurr = profileValues([1250.5, 450.0, 3100.2, 89.9], "montant");
  assert.equal(pCurr.detectedLogicalType, "CURRENCY");
  assert.equal(pCurr.isRatingCandidate, false);

  // 3. Pourcentages décimaux (0..1)
  const pPct = profileValues([0.15, 0.22, 0.08, 0.45], "taux_marge");
  assert.equal(pPct.detectedLogicalType, "PERCENTAGE");
  assert.equal(pPct.isPercentageCandidate, true);

  // 4. Quantités entières
  const pQty = profileValues([10, 5, 25, 3], "quantite");
  assert.equal(pQty.detectedLogicalType, "QUANTITY");
  assert.equal(pQty.isIntegerOnly, true);
});

test("Extraction d'Unités & Devises", () => {
  const u1 = extractUnit("Prix unitaire (USD)");
  assert.equal(u1.currencyCode, "USD");
  assert.equal(u1.unitType, "currency");

  const u2 = extractUnit("Marge brute (%)");
  assert.equal(u2.unitSymbol, "%");
  assert.equal(u2.unitType, "percentage");

  const u3 = extractUnit("delai_expedition (jours)");
  assert.equal(u3.unitSymbol, "days");
  assert.equal(u3.unitType, "duration");
});

test("Voisinage des Colonnes & Désambiguïsation de 'amount'", () => {
  // 1. Voisinage de commande : order_id, quantity, unit_price
  const ctxOrder = analyzeContext("Commandes_Septembre", ["order_id", "customer_id", "quantity", "unit_price", "amount"]);
  assert.equal(ctxOrder.isOrderContext, true);
  assert.equal(ctxOrder.inferredEntity, "Order");

  const disamOrder = disambiguateGenericAmount("amount", ctxOrder);
  assert.equal(disamOrder.resolvedConceptId, "sales.revenue.net");
  assert.equal(disamOrder.targetField, "total");

  // 2. Voisinage de dépenses : supplier, expense_category
  const ctxExpense = analyzeContext("Factures_2026", ["expense_id", "supplier", "expense_category", "amount"]);
  assert.equal(ctxExpense.isExpenseContext, true);
  assert.equal(ctxExpense.inferredEntity, "Expense");

  const disamExpense = disambiguateGenericAmount("amount", ctxExpense);
  assert.equal(disamExpense.resolvedConceptId, "finance.expense.operating");
  assert.equal(disamExpense.targetField, "amount");
});

test("Pénalités de Contradiction - gross_profit vs gross_margin & Trésorerie", () => {
  // 1. En-tête avec '%' appliqué à gross_profit ($)
  const contraProfit = evaluateContradictions(
    "finance.profit.gross",
    "Gross Margin %",
    ["gross", "margin"],
    undefined,
    { unitType: "percentage", unitSymbol: "%", confidence: 0.95 }
  );
  assert.equal(contraProfit.hasContradiction, true);
  assert.ok(contraProfit.penalty >= 0.6, "Doit infliger une pénalité sévère pour confusion profit/marge %");

  // 2. En-tête 'Solde Cloture' appliqué à opening_cash
  const contraCash = evaluateContradictions(
    "treasury.cash.opening",
    "Solde Cloture",
    ["solde", "cloture"]
  );
  assert.equal(contraCash.hasContradiction, true);
  assert.ok(contraCash.penalty >= 0.9, "Doit infliger une pénalité maximale pour inversion ouverture/clôture");
});

test("Scoring Multi-Critères avec Déduction des Pénalités", () => {
  const ctxOrder = analyzeContext("Ventes", ["order_id", "customer_id", "total"]);
  const uCurr = { unitType: "currency", currencyCode: "CAD", confidence: 0.9 };
  const pCurr = profileValues([150.0, 230.5], "total");

  // Cas cohérent : sales.revenue.net
  const scoreCoherent = scoreCandidate(
    "sales.revenue.net",
    "Total Ventes ($)",
    ["total", "ventes"],
    0.95,
    0.9,
    ctxOrder,
    pCurr,
    uCurr
  );
  assert.ok(scoreCoherent.confidence >= 0.85, "Score élevé pour concept cohérent");
  assert.equal(scoreCoherent.penalty, 0);

  // Cas contradictoire : quantite_vendue sur sales.revenue.net
  const scoreContradictory = scoreCandidate(
    "sales.revenue.net",
    "Quantite vendue",
    ["quantite", "vendue", "qty"],
    0.1,
    0.0,
    ctxOrder,
    profileValues([5, 10, 2], "quantite"),
    undefined
  );
  assert.ok(scoreContradictory.penalty > 0, "Doit comporter une pénalité de contradiction");
  assert.ok(scoreContradictory.confidence < 0.4, "Score fortement dégradé par la contradiction");
});

