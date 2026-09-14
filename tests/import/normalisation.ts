import { parseNumber, parseDate, coerceType, coerceEnum } from "../../base44/shared/importUtils.ts";

const cas: [any, number | null, string][] = [
  [1234.56, 1234.56, "nombre natif"],
  ["1 234,56", 1234.56, "FR espace + virgule"],
  ["1,234.56", 1234.56, "EN virgule milliers"],
  ["1.234,56", 1234.56, "EU point milliers"],
  ["45 000", 45000, "espace milliers"],
  ["45,000", 45000, "virgule milliers 3 chiffres"],
  ["1.234", 1234, "point milliers 3 chiffres"],
  ["0,125", 0.125, "taux decimal commencant par 0"],
  ["0.125", 0.125, "taux decimal point"],
  ["1234.567", 1234.567, "4 chiffres + 3 decimales = decimal"],
  ["(500)", -500, "parentheses comptables"],
  ["-500", -500, "negatif"],
  ["12 %", 12, "pourcentage"],
  ["1 500,00 $", 1500, "montant avec devise"],
  ["1 500,00 CAD", 1500, "montant avec code devise"],
  ["", null, "vide"],
  ["n/a", null, "non disponible"],
  ["1.5M", 1500000, "abreviation million"],
  ["2,5k", 2500, "abreviation millier"],
  ["12,345", 12345, "ambigu : milliers par convention"],
];
let ko = 0;
console.log("=== parseNumber ===");
for (const [entree, attendu, libelle] of cas) {
  const r = parseNumber(entree);
  const ok = r === attendu;
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${String(libelle).padEnd(34)} ${JSON.stringify(entree).padEnd(14)} -> ${r}  (attendu ${attendu})`);
}

const casDate: [any, string | null, string][] = [
  ["2025-03-15", "2025-03-15", "ISO"],
  ["15/03/2025", "2025-03-15", "DD/MM/YYYY"],
  ["15-03-25", "2025-03-15", "DD-MM-YY"],
  ["03/15/2025", "2025-03-15", "MM/DD/YYYY non ambigu"],
  ["15 janv. 2025", "2025-01-15", "mois francais abrege"],
  ["15 janvier 2025", "2025-01-15", "mois francais complet"],
  [45731, "2025-03-15", "serie Excel"],
  ["2025-03", "2025-03-01", "periode YYYY-MM"],
  ["2025-03-15T10:22:00Z", "2025-03-15", "ISO avec heure"],
  ["pas une date", null, "texte libre"],
  ["Lundi 3 mars", null, "date en toutes lettres non geree"],
  ["", null, "vide"],
];
console.log("\n=== parseDate ===");
for (const [entree, attendu, libelle] of casDate) {
  const r = parseDate(entree);
  const ok = r === attendu;
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${String(libelle).padEnd(34)} ${JSON.stringify(entree).padEnd(24)} -> ${r}  (attendu ${attendu})`);
}

console.log("\n=== coerceType sur un champ date ===");
const propDate = { type: "string", format: "date" };
for (const v of ["15/03/2025", "pas une date", "Lundi 3 mars 2025", "31/02/2025"]) {
  console.log(`  ${JSON.stringify(v).padEnd(24)} -> ${JSON.stringify(coerceType(v, propDate))}`);
}
console.log("\ncas en echec :", ko);
