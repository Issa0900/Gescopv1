import { normalizeKeys, normalizeRow, ALIAS_CANONIQUES } from "../../base44/shared/importUtils.ts";
import { ENTITY_FIELD_MAP } from "../../src/lib/core/entityFieldMap.js";

// A small test suite to validate mapping robustness on messy data
const tests = [];

// 1. Clean French dataset (Expected: mapped cleanly)
tests.push({
  name: "Clean French Retail",
  entity: "Order",
  row: { "Date de commande": "2023-01-01", "Client": "CUS-1", "Montant": 100, "Statut": "Livré" },
  expectedKeys: ["date", "customer_id", "total", "fulfillment_status"] // Depending on entity map
});

// 2. Messy English Kaggle dataset (Missing values, casing issues)
tests.push({
  name: "Messy English Kaggle (Churn)",
  entity: "Customer",
  row: { "CustomerID ": "15628319", " surname ": "Hargrave", "CreditScore": 619, "Geography": "France", "Gender": "Female", "Tenure": 2, "Balance": 0, "NumOfProducts": 1, "HasCrCard": 1, "IsActiveMember": 1, "EstimatedSalary": 101348.88, "Exited": 1 },
  expectedKeys: ["customer_id", "last_name", "quality_score", "country", "gender", "customer_tenure", "balance", "total_orders", "has_credit_card", "status", "estimated_revenue", "churn_risk"]
});

// 3. Very Messy French/English Mix (Inconsistent dates, currency symbols, typos)
tests.push({
  name: "Messy FrEn Mix (Transactions)",
  entity: "Transaction",
  row: { "txn date": "12-05-2023", "Dépense": "- 50,00 €", "CATÉGORIE": "Utilitaires", "Merchant": "EDF" },
  expectedKeys: ["date", "amount", "category", "source"]
});

console.log("=== GESCOP DATASET LIBRARY: Mapping Tests ===");

tests.forEach((t, i) => {
  console.log(`\nTest ${i+1}: ${t.name} -> Entity: ${t.entity}`);
  // We mock properties from ENTITY_FIELD_MAP
  const properties = ENTITY_FIELD_MAP[t.entity] || {};
  // properties in importUtils are expected to be an object where keys are the target fields
  const mockSchemaProps = {};
  for (const field of Object.keys(properties)) {
    mockSchemaProps[field] = { type: "string" }; // mock definition
  }
  
  const mapped = normalizeKeys(t.row, mockSchemaProps);
  console.log("Input Row:", t.row);
  console.log("Mapped Row:", mapped);
  
  const foundKeys = Object.keys(mapped);
  const missing = t.expectedKeys.filter(k => !foundKeys.includes(k));
  if (missing.length > 0) {
    console.log("❌ FAILED. Missing keys:", missing);
  } else {
    console.log("✅ PASSED. All expected keys mapped.");
  }
});

