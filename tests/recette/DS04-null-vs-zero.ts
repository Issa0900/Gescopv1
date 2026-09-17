// Reconstruction du cas DS04 (donnee absente != 0, sec10 de l'audit).
// Une transaction sans colonne montant, ou avec un montant illisible, ne
// doit jamais devenir amount=0 : elle doit rester non mesuree (undefined),
// ce qui la fait passer en quarantaine plutot que fausser les sommes.
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;

const cas: [string, Record<string, any>, number | undefined][] = [
  ["montant vide (chaine vide)", { "Date": "2026-03-01", "Montant": "", "Type": "Revenu" }, undefined],
  ["montant absent (colonne manquante)", { "Date": "2026-03-01", "Type": "Revenu" }, undefined],
  ["montant N/A", { "Date": "2026-03-01", "Montant": "N/A", "Type": "Revenu" }, undefined],
  ["montant tiret seul", { "Date": "2026-03-01", "Montant": "-", "Type": "Revenu" }, undefined],
  ["montant reellement zero (chaine '0')", { "Date": "2026-03-01", "Montant": "0", "Type": "Revenu" }, 0],
  ["montant reellement zero (nombre 0)", { "Date": "2026-03-01", "Montant": 0, "Type": "Revenu" }, 0],
  ["montant negatif reel (depense)", { "Date": "2026-03-01", "Montant": "-45.50", "Type": "Depense" }, 45.5],
];

for (const [libelle, row, attendu] of cas) {
  const n = normalizeRow("Transaction", row, "imp-1", schema.properties, "csv", []);
  const manque = missingRequired(n, schema.required);
  const bon = attendu === undefined
    ? (n.amount === undefined && manque.includes("amount"))
    : (n.amount === attendu && manque.length === 0);
  t(bon, `${libelle.padEnd(38)} amount=${n.amount} quarantaine=${manque.join(",") || "non"} (attendu ${attendu === undefined ? "quarantaine, jamais 0" : attendu})`);
}

console.log("\ncas en echec :", e);
