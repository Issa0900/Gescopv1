// ─────────────────────────────────────────────────────────────────────────────
// Tests Unitaires — Architecture Universelle V3.0 (Septembre 2026)
// Couverture : Document Classifier, Grain Engine, Quality Engine, Decision Matrix
// Cas Révélateur : Nordik_PleinAir_Donnees_Complet_2026.xlsx [Sommaire Exécutif]
// ─────────────────────────────────────────────────────────────────────────────

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyDocumentSheet } from "../base44/shared/core/documentClassifier.ts";
import { analyzeGrain } from "../base44/shared/core/grainEngine.ts";
import { profileValues, detectSemanticCategory } from "../base44/shared/core/recognition/valueProfiler.ts";
import { calculateQualityProfile } from "../base44/shared/core/qualityEngine.ts";
import { evaluateDecision } from "../base44/shared/core/decisionMatrix.ts";
import { planParRegles } from "../base44/shared/importPlan.ts";
import { normalizeRow } from "../base44/shared/importUtils.ts";
import { DOCUMENT_ARCHETYPES, GRAIN_LEVELS, VALUE_SEMANTIC_CATEGORIES } from "../base44/shared/core/ontology/types.ts";

test("Universal V3 — Cas Réel Révélateur : Sommaire Exécutif Nordik Plein Air", () => {
  // Matrice brute identique à la feuille [Sommaire Exécutif] de Nordik Plein Air
  const headers = ["Succursale", "Total Ventes", "Coût Total ($)", "Profit Brut ($)", "% Marge"];
  const rows = [
    { "Succursale": "Québec", "Total Ventes": "125000", "Coût Total ($)": "75000", "Profit Brut ($)": "50000", "% Marge": "40%" },
    { "Succursale": "Montréal", "Total Ventes": "210000", "Coût Total ($)": "126000", "Profit Brut ($)": "84000", "% Marge": "40%" },
    { "Succursale": "Lévis", "Total Ventes": "95000", "Coût Total ($)": "57000", "Profit Brut ($)": "38000", "% Marge": "40%" },
    { "Succursale": "Trois-Rivières", "Total Ventes": "82000", "Coût Total ($)": "49200", "Profit Brut ($)": "32800", "% Marge": "40%" },
    { "Succursale": "Sherbrooke", "Total Ventes": "88000", "Coût Total ($)": "52800", "Profit Brut ($)": "35200", "% Marge": "40%" },
    { "Succursale": "Gatineau", "Total Ventes": "79000", "Coût Total ($)": "47400", "Profit Brut ($)": "31600", "% Marge": "40%" },
    { "Succursale": "Rimouski", "Total Ventes": "64000", "Coût Total ($)": "38400", "Profit Brut ($)": "25600", "% Marge": "40%" },
    { "Succursale": "Saguenay", "Total Ventes": "71000", "Coût Total ($)": "42600", "Profit Brut ($)": "28400", "% Marge": "40%" },
    { "Succursale": "TOTAL", "Total Ventes": "814000", "Coût Total ($)": "488400", "Profit Brut ($)": "325600", "% Marge": "40%" },
  ];

  // 1. Détection de l'Archétype de document
  const sheetClass = classifyDocumentSheet({
    sheetName: "Nordik_PleinAir_Donnees_Complet_2026.xlsx [Sommaire Exécutif]",
    headers,
    rows,
  });

  assert.equal(sheetClass.archetype, DOCUMENT_ARCHETYPES.AGGREGATED_SUMMARY);
  assert.equal(sheetClass.isAggregatedSummary, true);
  assert.equal(sheetClass.hasSummaryTotalRow, true);
  assert.equal(sheetClass.totalRowIndices.length, 1);
  assert.equal(sheetClass.totalRowIndices[0], 8); // Index 8 est la ligne "TOTAL"
  assert.equal(sheetClass.grain.primaryGrain, GRAIN_LEVELS.LOCATION);
  assert.equal(sheetClass.groupDimension, "Succursale");

  // 2. Profil de Qualité multi-critères
  const quality = calculateQualityProfile({
    headers,
    rows,
    averageSemanticConfidence: 0.95,
    isAggregatedSummary: true,
  });

  // Ne doit PAS être 0/100 ! Doit être un score d'excellence (>= 85/100)
  assert.ok(quality.overallQualityScore >= 85, `Score de qualité inattendu : ${quality.overallQualityScore}`);
  assert.equal(quality.isolatedSummaryRows, 1);
  assert.equal(quality.usableRows, 8);
  assert.equal(quality.completenessScore, 100);

  // 3. Matrice de Décision
  const decision = evaluateDecision(quality, 0.95);
  assert.ok(decision.confidenceScore >= 90);
  assert.equal(decision.canAutoProceed, true);

  // 4. Intégration dans planParRegles
  const rawMatrix = [
    headers,
    ...rows.map(r => headers.map(h => r[h]))
  ];
  const plan = planParRegles(rawMatrix, "Sommaire Exécutif.xlsx");
  assert.equal(plan.isAggregatedSummary, true);
  assert.equal(plan.archetype, DOCUMENT_ARCHETYPES.AGGREGATED_SUMMARY);
  assert.equal(plan.grain, GRAIN_LEVELS.LOCATION);
  assert.deepEqual(plan.lignes_ignorees, [9]); // Index 9 dans la matrice (ligne TOTAL)

  // Vérifier le mapping propre des colonnes
  const mappedCols = Object.fromEntries(plan.colonnes.map(c => [c.colonne, c.champ]));
  assert.equal(mappedCols["Succursale"], "location_id");
  assert.equal(mappedCols["Coût Total ($)"], "total_cost");
  assert.equal(mappedCols["Profit Brut ($)"], "gross_profit");
  assert.equal(mappedCols["% Marge"], "gross_margin");
  assert.equal(mappedCols["Total Ventes"], "total_revenue");
});

test("Universal V3 — Grain Engine : Détection Fine vs Composite vs Agrégé", () => {
  // Cas 1 : Grain Commande simple (1 ligne = 1 order_id unique)
  const orderHeaders = ["order_id", "customer_id", "date", "total_revenue"];
  const orderRows = [
    { order_id: "CMD-101", customer_id: "CUST-1", date: "2026-03-01", total_revenue: 120 },
    { order_id: "CMD-102", customer_id: "CUST-2", date: "2026-03-01", total_revenue: 250 },
    { order_id: "CMD-103", customer_id: "CUST-1", date: "2026-03-02", total_revenue: 90 },
  ];
  const orderGrain = analyzeGrain(orderHeaders, orderRows);
  assert.equal(orderGrain.primaryGrain, GRAIN_LEVELS.ORDER);
  assert.equal(orderGrain.isAggregated, false);

  // Cas 2 : Grain Ligne de commande (clé composite [order_id, product_id])
  const lineHeaders = ["order_id", "product_id", "quantity", "unit_price"];
  const lineRows = [
    { order_id: "CMD-101", product_id: "P-1", quantity: 2, unit_price: 50 },
    { order_id: "CMD-101", product_id: "P-2", quantity: 1, unit_price: 20 },
    { order_id: "CMD-102", product_id: "P-1", quantity: 5, unit_price: 50 },
  ];
  const lineGrain = analyzeGrain(lineHeaders, lineRows);
  assert.equal(lineGrain.primaryGrain, GRAIN_LEVELS.ORDER_LINE);
  assert.deepEqual(lineGrain.compositeKeyCandidate, ["order_id", "product_id"]);

  // Cas 3 : Master Data Produit (clé unique product_id)
  const prodHeaders = ["product_id", "product_name", "selling_price", "purchase_cost"];
  const prodRows = [
    { product_id: "P-1", product_name: "Tente Alpinisme", selling_price: 450, purchase_cost: 220 },
    { product_id: "P-2", product_name: "Sac à dos 50L", selling_price: 180, purchase_cost: 85 },
  ];
  const prodGrain = analyzeGrain(prodHeaders, prodRows);
  assert.equal(prodGrain.primaryGrain, GRAIN_LEVELS.PRODUCT);
});

test("Universal V3 — Profilage Sémantique des Valeurs (Lévis != Département)", () => {
  // 1. Colonne de Villes / Succursales québécoises
  const branchValues = ["Montréal", "Québec", "Lévis", "Trois-Rivières", "Sherbrooke"];
  const geoResult = detectSemanticCategory(branchValues, "Succursale");
  assert.equal(geoResult.category, VALUE_SEMANTIC_CATEGORIES.GEOGRAPHIC_LOCATION);
  assert.ok(geoResult.confidence >= 0.85);

  const geoProfile = profileValues(branchValues, "Succursale");
  assert.equal(geoProfile.semanticCategory, VALUE_SEMANTIC_CATEGORIES.GEOGRAPHIC_LOCATION);
  assert.equal(geoProfile.isUniqueKeyCandidate, true);

  // 2. Colonne de Départements organisationnels
  const deptValues = ["Direction", "Ventes", "Marketing", "Logistique", "Atelier"];
  const deptResult = detectSemanticCategory(deptValues, "Département");
  assert.equal(deptResult.category, VALUE_SEMANTIC_CATEGORIES.ORGANIZATIONAL_DEPARTMENT);
  assert.ok(deptResult.confidence >= 0.85);

  // 3. Colonne de Canaux Publicitaires Omnicanaux réels
  const channelValues = ["Facebook Ads", "Google Ads", "Courriel", "Affichage / Web", "Partenariat SEPAQ"];
  const chanResult = detectSemanticCategory(channelValues, "Canal de diffusion");
  assert.equal(chanResult.category, VALUE_SEMANTIC_CATEGORIES.MARKETING_CHANNEL);
  assert.ok(chanResult.confidence >= 0.85);
});

test("Universal V3 — Matrice de Décision Multi-Niveaux (Section 26)", () => {
  // Score 96 -> AUTOMATIC
  const perfectQuality = {
    overallQualityScore: 98,
    completenessScore: 100,
    structuralScore: 100,
    consistencyScore: 100,
    uniquenessScore: 100,
    semanticConfidence: 96,
    riskLevel: "LOW",
    totalRows: 100,
    usableRows: 100,
    quarantinedRows: 0,
    isolatedSummaryRows: 0,
    diagnostics: [],
  };
  const decision96 = evaluateDecision(perfectQuality, 0.96);
  assert.equal(decision96.action, "AUTOMATIC");
  assert.equal(decision96.canAutoProceed, true);

  // Score 92 -> AUTOMATIC_LOGGED
  const goodQuality = { ...perfectQuality, overallQualityScore: 92 };
  const decision92 = evaluateDecision(goodQuality, 0.92);
  assert.equal(decision92.action, "AUTOMATIC_LOGGED");
  assert.equal(decision92.canAutoProceed, true);

  // Score 80 -> RECOMMENDED_REVIEW
  const reviewQuality = { ...perfectQuality, overallQualityScore: 80 };
  const decision80 = evaluateDecision(reviewQuality, 0.80);
  assert.equal(decision80.action, "RECOMMENDED_REVIEW");
  assert.equal(decision80.canAutoProceed, false);
  assert.equal(decision80.requiresUserConfirmation, true);

  // Score 40 -> QUARANTINE_REJECT
  const badQuality = { ...perfectQuality, overallQualityScore: 40, completenessScore: 35, riskLevel: "HIGH" };
  const decision40 = evaluateDecision(badQuality, 0.40);
  assert.equal(decision40.action, "QUARANTINE_REJECT");
  assert.equal(decision40.canAutoProceed, false);
});

test("Universal V3 — Normalisation et Sauvetage d'une Ligne de Synthèse Succursale", () => {
  // Test normalizeRow sur l'entité ExecutiveSummary
  const rawSummaryRow = {
    location_id: "Lévis",
    total_revenue: "95 000,00 $",
    total_cost: "57000",
    gross_profit: "", // Doit être déduit automatiquement
    gross_margin: "", // Doit être déduit automatiquement
  };

  const normalized = normalizeRow("ExecutiveSummary", rawSummaryRow);
  assert.equal(normalized.location_id, "Lévis");
  assert.equal(normalized.summary_id, "SUM-LEVIS");
  assert.equal(normalized.total_revenue, 95000);
  assert.equal(normalized.total_cost, 57000);
  assert.equal(normalized.gross_profit, 38000); // 95000 - 57000
  assert.equal(normalized.gross_margin, 40);    // (38000 / 95000) * 100
});

