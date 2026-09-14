import { detectEntityByName, detectEntityByHeaders, detectEntityByFieldOverlap } from "../../base44/shared/sheetDetect.ts";
import { normalizeKeys, normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

let echecs = 0;
const verif = (ok: boolean, msg: string) => { if (!ok) echecs++; console.log(`${ok ? "ok  " : "KO  "} ${msg}`); };

console.log("========== ETAPE 1 : CLASSIFICATION (quel type de donnees ?) ==========");
const fichiers: [string, string[], string][] = [
  ["Transactions_2026.csv", ["Date", "Montant", "Type", "Catégorie", "Description"], "Transaction"],
  ["Ventes janvier.xlsx",   ["No_commande", "Date", "Client_id", "Total"], "Order"],
  ["Liste clients.csv",     ["ID_client", "Nom", "Courriel", "Date d'acquisition"], "Customer"],
  ["catalogue.csv",         ["ID_produit", "Nom du produit", "Prix", "Coût"], "Product"],
  ["Inventaire mars.csv",   ["Date", "ID_produit", "Stock_cloture"], "Inventory"],
  ["releve bancaire.csv",   ["Date opération", "Montant", "Type"], "Transaction"],
  ["Feuil1",                ["Date", "Montant", "Type"], "Transaction"],
];
for (const [nom, entetes, attendu] of fichiers) {
  const parNom = detectEntityByName(nom);
  const parEntetes = detectEntityByHeaders(entetes);
  const parRecoupement = detectEntityByFieldOverlap(entetes);
  const retenu = parNom || parEntetes || parRecoupement;
  verif(retenu === attendu,
    `${nom.padEnd(24)} -> ${String(retenu).padEnd(12)} (attendu ${attendu})  [nom:${parNom} entetes:${parEntetes} recoup:${parRecoupement}]`);
}

console.log("\n========== ETAPE 2 : MAPPING DES COLONNES ==========");
const mappings: [string, Record<string, any>, string[]][] = [
  ["Transaction", { "Date": "2026-03-15", "Montant": "1 250,50 $", "Type": "Revenu", "Catégorie": "Ventes" }, ["date","amount","type","category"]],
  ["Order",       { "No_commande": "C-1001", "Date": "15/03/2026", "ID_client": "CL-7", "Total": "89,99" }, ["order_id","date","customer_id","total"]],
  ["Customer",    { "ID_client": "CL-7", "Nom": "Boulangerie Nord", "Date d'acquisition": "2025-11-02", "CA total": "4 300" }, ["customer_id","name","acquisition_date","total_revenue"]],
  ["Product",     { "ID_produit": "P-1", "Nom du produit": "Café filtre", "Prix de vente": "3,50", "Coût achat": "1,10" }, ["product_id","product_name","selling_price","purchase_cost"]],
];
for (const [entite, ligne, champsAttendus] of mappings) {
  const schema = getSchema(entite);
  const mappe = normalizeKeys(ligne, schema ? schema.properties : null);
  const obtenus = Object.keys(mappe);
  const manquants = champsAttendus.filter((c) => !obtenus.includes(c));
  const inconnus = obtenus.filter((c) => schema && !Object.keys(schema.properties).includes(c));
  verif(manquants.length === 0,
    `${entite.padEnd(12)} colonnes -> ${obtenus.join(", ")}${manquants.length ? "  | NON MAPPES: " + manquants.join(", ") : ""}${inconnus.length ? "  | hors schema: " + inconnus.join(", ") : ""}`);
}

console.log("\n========== ETAPE 3 : NORMALISATION + VALIDATION ==========");
const lignesSales = [
  { libelle: "montant FR + date FR + type francais",
    row: { "Date": "15/03/2026", "Montant": "1 250,50 $", "Type": "Revenu", "Catégorie": "Ventes" }, valide: true },
  { libelle: "depense entre parentheses",
    row: { "Date": "2026-03-16", "Montant": "(864,30)", "Type": "Dépense", "Catégorie": "Fournitures" }, valide: true },
  { libelle: "serie Excel en date",
    row: { "Date": 46096, "Montant": "500", "Type": "income" }, valide: true },
  { libelle: "date illisible -> doit etre rejetee",
    row: { "Date": "le 15 du mois", "Montant": "500", "Type": "income" }, valide: false },
  { libelle: "31 fevrier -> doit etre rejetee",
    row: { "Date": "31/02/2026", "Montant": "500", "Type": "income" }, valide: false },
];
const schemaTx = getSchema("Transaction")!;
for (const c of lignesSales) {
  const n = normalizeRow("Transaction", c.row, "imp-1", schemaTx.properties, "csv", []);
  const manque = missingRequired(n, schemaTx.required);
  const accepte = manque.length === 0;
  verif(accepte === c.valide,
    `${c.libelle.padEnd(38)} date=${JSON.stringify(n.date)} montant=${n.amount} type=${n.type} -> ${accepte ? "ACCEPTEE" : "QUARANTAINE (" + manque.join(",") + ")"}`);
}
console.log("\ncas en echec :", echecs);
