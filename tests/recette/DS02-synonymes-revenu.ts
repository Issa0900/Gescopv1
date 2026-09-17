// Reconstruction du cas DS02 du rapport de recette (mapping universel des
// colonnes, §6 de l'audit) : un releve de transactions dont la colonne de
// montant s'appelle CA / Chiffre d'affaires / Ventes / Sales / Revenue /
// Net Sales / Total Sales doit etre importe, pas mis en quarantaine.
//
// Avant correction : ALIAS_CANONIQUES resolvait tous ces synonymes vers un
// champ generique "revenue"/"net_revenue"/"gross_revenue" qui n'existe sur
// AUCUN schema d'entite (Transaction a "amount", Order/Customer ont
// "total_revenue"). Le montant disparaissait silencieusement et la ligne
// entiere partait en quarantaine pour "amount" manquant — pour une colonne
// financiere aussi centrale que le montant d'une transaction.
import { normalizeKeys, normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;
const synonymes = ["CA", "Chiffre d'affaires", "chiffre_affaires", "Ventes", "Sales", "Revenue", "Net Sales", "Total Sales"];
for (const col of synonymes) {
  const row = { "Date": "2026-03-15", [col]: "1250,50", "Type": "Revenu" };
  const mapped = normalizeKeys(row, schema.properties);
  const n = normalizeRow("Transaction", row, "imp-1", schema.properties, "csv", []);
  const manque = missingRequired(n, schema.required);
  t(manque.length === 0 && n.amount === 1250.5,
    `colonne "${col}" -> mapped keys: ${Object.keys(mapped).join(",")} | amount=${n.amount} | quarantaine=${manque.join(",") || "non"}`);
}

// Non-regression : les entites qui ont un vrai champ total_revenue doivent
// y recevoir la valeur (priorite sur "amount", qu'elles n'ont d'ailleurs pas).
const schemaCustomer = getSchema("Customer")!;
for (const col of ["Chiffre d'affaires", "CA", "Sales", "Revenue"]) {
  const client = normalizeKeys({ "customer_id": "CL-1", [col]: "4300" }, schemaCustomer.properties);
  t(client.total_revenue === "4300" && client.amount === undefined,
    `Customer: "${col}" -> total_revenue (pas de champ "amount" invente) : ${JSON.stringify(client)}`);
}

console.log("\ncas en echec :", e);
