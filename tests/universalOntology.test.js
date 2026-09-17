import test from "node:test";
import assert from "node:assert/strict";
import { UniversalCommercialOntology } from "../base44/shared/core/UniversalCommercialOntology.ts";
import { planParRegles } from "../base44/shared/importPlan.ts";

test("E2E - Reconnaissance Multilingue Universelle (7 Langues vers sales.revenue.net)", () => {
  const testHeaders = [
    { header: "CA HT", lang: "fr" },
    { header: "Chiffre d'Affaires Net", lang: "fr" },
    { header: "Net Sales", lang: "en" },
    { header: "Net Revenue", lang: "en" },
    { header: "Ingresos netos", lang: "es" },
    { header: "Receita liquida", lang: "pt" },
    { header: "Nettoumsatz", lang: "de" },
    { header: "Ricavi netti", lang: "it" },
    { header: "Netto omzet", lang: "nl" },
  ];

  for (const item of testHeaders) {
    const res = UniversalCommercialOntology.analyzeColumn({
      columnName: item.header,
      sampleValues: [1500.0, 240.5, 8900.0],
      siblingColumns: ["date", "customer_id", "quantity"],
    });

    assert.equal(
      res.selectedConcept,
      "sales.revenue.net",
      `Échec de reconnaissance pour '${item.header}' (${item.lang})`
    );
    assert.ok(res.confidence >= 0.8, `Confiance insuffisante pour '${item.header}': ${res.confidence}`);
    assert.equal(res.nature, "financial_measure");
    assert.equal(res.role, "FLOW");
    assert.equal(res.aggregation, "SUM");
  }
});

test("E2E - Variations de Casse & Conventions (camelCase, kebab-case, snake_case)", () => {
  const cases = [
    "CustomerLifetimeValue",
    "customerLifetimeValue",
    "customer_lifetime_value",
    "customer-lifetime-value",
    "CLV",
    "LTV",
  ];

  for (const c of cases) {
    const res = UniversalCommercialOntology.analyzeColumn({
      columnName: c,
      sampleValues: [2400.0, 1850.0, 3900.0],
      siblingColumns: ["customer_id", "churn_risk"],
    });

    assert.equal(res.selectedConcept, "customers.value.ltv", `Échec pour la variante '${c}'`);
    assert.ok(res.confidence >= 0.75);
  }
});

test("E2E - Tolérance aux Fautes de Frappe en Production", () => {
  // 1. Faute sur revenu
  const res1 = UniversalCommercialOntology.analyzeColumn({
    columnName: "revennus",
    sampleValues: [1200.0, 450.0],
    siblingColumns: ["order_id", "date"],
  });
  assert.equal(res1.selectedConcept, "sales.revenue.net");
  assert.ok(res1.evidence.some((e) => e.toLowerCase().includes("faute")));

  // 2. Faute sur quantite
  const res2 = UniversalCommercialOntology.analyzeColumn({
    columnName: "quatite vendue",
    sampleValues: [5, 12, 1],
    siblingColumns: ["product_id", "unit_price"],
  });
  assert.equal(res2.selectedConcept, "sales.volume.quantity");
});

test("E2E - Distinction Stricte gross_profit ($) vs gross_margin (%)", () => {
  // A. Marge en montant ($)
  const resProfit = UniversalCommercialOntology.analyzeColumn({
    columnName: "Gross Profit ($)",
    sampleValues: [450.0, 120.0, 890.0],
    siblingColumns: ["revenue", "cogs"],
  });
  assert.equal(resProfit.selectedConcept, "finance.profit.gross");
  assert.equal(resProfit.logicalType, "CURRENCY");

  // B. Marge en ratio / %
  const resMargin = UniversalCommercialOntology.analyzeColumn({
    columnName: "Gross Margin (%)",
    sampleValues: [0.35, 0.42, 0.28],
    siblingColumns: ["revenue", "cogs"],
  });
  assert.equal(resMargin.selectedConcept, "finance.margin.gross_rate");
  assert.equal(resMargin.logicalType, "PERCENTAGE");
  assert.notEqual(resProfit.selectedConcept, resMargin.selectedConcept);
});

test("E2E - Distinction des 4 Flux de Trésorerie (Opening, Inflow, Outflow, Closing)", () => {
  const sheet = [
    { col: "Solde Initial", expected: "treasury.cash.opening", target: "opening_cash" },
    { col: "Encaissements", expected: "treasury.cash.inflow", target: "cash_in" },
    { col: "Decaissements", expected: "treasury.cash.outflow", target: "cash_out" },
    { col: "Solde Final", expected: "treasury.cash.closing", target: "closing_cash" },
  ];

  for (const item of sheet) {
    const res = UniversalCommercialOntology.analyzeColumn({
      columnName: item.col,
      sheetName: "Flux_Tresorerie_2026",
      sampleValues: [50000.0, 12000.0, 8000.0, 54000.0],
      siblingColumns: sheet.map((s) => s.col),
      entityHint: "Cashflow",
    });

    assert.equal(res.selectedConcept, item.expected, `Échec pour '${item.col}'`);
    assert.equal(res.targetField, item.target);
  }
});

test("E2E - Décomposition d'un Terme Composé Inconnu (Section 65)", () => {
  const res = UniversalCommercialOntology.analyzeColumn({
    columnName: "customer_value_index",
    sampleValues: [1.2, 0.8, 1.5],
    siblingColumns: ["customer_id", "revenue"],
  });

  assert.equal(res.selectedConcept, "custom.customer_value_index");
  assert.equal(res.confidence, 0.63, "Doit proposer 63% de confiance comme spécifié en Section 65");
  assert.equal(res.requiresValidation, true, "Validation explicite requise");
  assert.ok(res.evidence.some((e) => e.includes("tokens connus")));
});

test("E2E - Import Réel Déterministe avec planParRegles (Table Order)", () => {
  // Matrice brute simulant un fichier export PME
  const matrix = [
    ["Rapport des Ventes Mensuelles - Confidentiel"], // Ligne 0 : titre à ignorer
    ["No Commande", "Date Vente", "Code Client", "Qte", "Prix Unitaire ($)", "Remise", "CA Total ($)"], // Ligne 1 : en-têtes
    ["CMD-001", "2026-09-01", "CLI-99", "3", "45.00", "0.00", "135.00"],
    ["CMD-002", "2026-09-02", "CLI-102", "1", "120.00", "10.00", "110.00"],
    ["CMD-003", "2026-09-03", "CLI-54", "2", "85.50", "0.00", "171.00"],
    ["Total", "", "", "6", "", "10.00", "416.00"], // Ligne 5 : ligne de totaux
  ];

  const plan = planParRegles(matrix, "ventes_septembre.xlsx", "Order");

  assert.equal(plan.entite, "Order");
  assert.equal(plan.ligne_entetes, 1, "Doit identifier la ligne 1 comme ligne d'en-têtes");

  const colonnesMap = Object.fromEntries(plan.colonnes.map((c) => [c.colonne, c.champ]));

  assert.equal(colonnesMap["No Commande"], "order_id");
  assert.equal(colonnesMap["Date Vente"], "date");
  assert.equal(colonnesMap["Code Client"], "customer_id");
  assert.equal(colonnesMap["Qte"], "quantity");
  assert.equal(colonnesMap["Prix Unitaire ($)"], "unit_price");
  assert.equal(colonnesMap["Remise"], "discount");
  assert.equal(colonnesMap["CA Total ($)"], "total");
});

