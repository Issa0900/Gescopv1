// Reconstruction des cas devises differentes / formats de date varies
// (cas limites listes au sec3/sec12 de l'audit).
import { normalizeRow, parseDate } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;

console.log("== Devises ==");
const devises: [string, Record<string, any>, string][] = [
  ["colonne Devise = USD explicite", { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Devise": "USD" }, "USD"],
  ["colonne Currency = EUR explicite", { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Currency": "EUR" }, "EUR"],
  ["pas de colonne devise -> defaut raisonnable CAD", { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu" }, "CAD"],
];
for (const [libelle, row, attendu] of devises) {
  const n = normalizeRow("Transaction", row, "imp-1", schema.properties, "csv", []);
  t(n.currency === attendu, `${libelle.padEnd(48)} currency=${n.currency} (attendu ${attendu})`);
}

console.log("\n== Dates ==");
const dates: [string, string, string | null][] = [
  ["ISO", "2026-03-15", "2026-03-15"],
  ["DD/MM/YYYY", "15/03/2026", "2026-03-15"],
  ["annee bissextile valide", "29/02/2024", "2024-02-29"],
  ["annee NON bissextile -> rejetee", "29/02/2026", null],
  ["mois hors bornes -> rejetee", "2026-13-01", null],
  ["31 avril (30 jours) -> rejetee", "31/04/2026", null],
  ["ordinal francais 1er janvier", "1er janvier 2026", "2026-01-01"],
  ["mois francais abrege avec point", "15 janv. 2026", "2026-01-15"],
];
for (const [libelle, brut, attendu] of dates) {
  const obtenu = parseDate(brut);
  t(obtenu === attendu, `${libelle.padEnd(42)} "${brut}" -> ${obtenu} (attendu ${attendu})`);
}

console.log("\ncas en echec :", e);
