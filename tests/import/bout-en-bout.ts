// Un fichier realiste, ecrit comme un tableur francais le produit, traverse
// TOUTE la chaine : detection -> mapping -> normalisation -> agregation -> KPI.
// Chaque resultat est compare a un total calcule a la main.
import { detectEntityByHeaders } from "../../base44/shared/sheetDetect.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";
import { monthlyAggComplete, sumLast, lastVal } from "../../src/lib/periods.js";
import { aggregateMarginPct } from "../../src/lib/metrics.js";

let echecs = 0;
const verif = (obtenu: any, attendu: any, libelle: string) => {
  const ok = Math.abs(Number(obtenu) - Number(attendu)) < 0.01;
  if (!ok) echecs++;
  console.log(`${ok ? "ok  " : "KO  "} ${libelle.padEnd(46)} obtenu ${obtenu}   attendu ${attendu}`);
};

const moisIl = (n: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7); };

// ---- Le "fichier" tel qu'il sortirait d'un tableur quebecois ----
const entetes = ["Date opération", "Montant", "Type", "Catégorie"];
const fichier: Record<string, any>[] = [];
const ajouter = (mois: string, jour: string, montant: string, type: string, cat: string) =>
  fichier.push({ "Date opération": `${jour}/${mois.slice(5)}/${mois.slice(0, 4)}`, "Montant": montant, "Type": type, "Catégorie": cat });

// M-3 : 3 ventes de 10 000 $, 2 depenses de 9 000 $
["05", "12", "19"].forEach((j) => ajouter(moisIl(3), j, "10 000,00 $", "Revenu", "Ventes"));
["06", "20"].forEach((j) => ajouter(moisIl(3), j, "(9 000,00)", "Dépense", "Fournitures"));
// M-2 : 2 ventes de 12 500 $, 1 depense de 20 000 $
["03", "17"].forEach((j) => ajouter(moisIl(2), j, "12 500,00 $", "Revenu", "Ventes"));
ajouter(moisIl(2), "25", "20 000,00 $", "Dépense", "Salaires");
// M-1 : 4 ventes de 5 000 $, 2 depenses de 7 500 $
["02", "09", "16", "23"].forEach((j) => ajouter(moisIl(1), j, "5 000,00 $", "Revenu", "Ventes"));
["10", "27"].forEach((j) => ajouter(moisIl(1), j, "7 500,00 $", "Dépense", "Loyer"));
// 2 lignes volontairement corrompues : doivent partir en quarantaine
fichier.push({ "Date opération": "le mois dernier", "Montant": "999 999", "Type": "Revenu", "Catégorie": "Ventes" });
fichier.push({ "Date opération": "31/02/2026", "Montant": "888 888", "Type": "Revenu", "Catégorie": "Ventes" });

console.log("===== 1. Detection du type =====");
const entite = detectEntityByHeaders(entetes);
console.log(`${entite === "Transaction" ? "ok  " : "KO  "} entetes ${JSON.stringify(entetes)} -> ${entite}`);
if (entite !== "Transaction") echecs++;

console.log("\n===== 2. Normalisation et quarantaine =====");
const schema = getSchema("Transaction")!;
const acceptees: any[] = [];
let quarantaine = 0;
for (const ligne of fichier) {
  const n = normalizeRow("Transaction", ligne, "imp-test", schema.properties, "csv", []);
  if (missingRequired(n, schema.required).length > 0) { quarantaine++; continue; }
  acceptees.push(n);
}
verif(acceptees.length, 14, "lignes acceptees (14 saines)");
verif(quarantaine, 2, "lignes en quarantaine (2 corrompues)");
verif(Math.round((acceptees.length / fichier.length) * 100), 88, "score de qualite de l'import (%)");

console.log("\n===== 3. Agregation mensuelle =====");
const revenus = acceptees.filter((t) => t.type === "income");
const depenses = acceptees.filter((t) => t.type === "expense");
verif(revenus.length, 9, "lignes de revenus");
verif(depenses.length, 5, "lignes de depenses");
const revM = monthlyAggComplete(revenus, "date", "amount");
const depM = monthlyAggComplete(depenses, "date", "amount");
console.log("     revenus par mois :", revM.map((x: any) => `${x.month}=${x.val}`).join("  "));
console.log("     depenses par mois:", depM.map((x: any) => `${x.month}=${x.val}`).join("  "));

console.log("\n===== 4. KPI affiches =====");
verif(lastVal(revM), 20000, "Revenus (dernier mois complet)");
verif(lastVal(depM), 15000, "Depenses (dernier mois complet)");
verif(sumLast(revM, 3), 75000, "CA sur 3 mois");
verif(sumLast(depM, 3), 53000, "Depenses sur 3 mois");
verif(aggregateMarginPct(revM, depM, 3), ((75000 - 53000) / 75000) * 100, "Marge nette 3 mois (%)");
verif(((lastVal(revM) - lastVal(depM)) / lastVal(revM)) * 100, 25, "Marge du dernier mois complet (%)");

console.log("\ncas en echec :", echecs);
