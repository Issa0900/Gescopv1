// sec9 de l'audit (une metrique = un moteur) + bug d'architecture trouve en
// branchant Finance.jsx sur kpiRegistry.js : le moteur marquait un KPI
// entier "indisponible" des qu'UNE SEULE dependance candidate manquait,
// meme quand calculate() est ecrit pour des alternatives optionnelles
// (deps.a || deps.b). Sur des Transaction seules (pas de commandes/COGS),
// total_revenue et total_expense etaient donc TOUJOURS indisponibles,
// meme avec de vraies transactions presentes -- Finance.jsx affichait un
// Resultat Net et une Marge Nette a 0 en permanence.
//
// Racine plus profonde : Transaction.amount est un champ "contextuel"
// (income_amount ou expense_amount selon `type`), resolu UNE fois pour tout
// le lot sans enregistrement representatif -- _aggregateRawField ne
// pouvait donc jamais separer les revenus des depenses correctement.
import { computeKpiBatch } from "../../src/lib/core/kpiEngine.js";
import { getEntitySemantics } from "../../src/lib/core/entityFieldMap.js";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

function calc(transactions: any[]) {
  const sem = getEntitySemantics("Transaction");
  return computeKpiBatch(["total_revenue", "total_expense", "net_income", "net_margin_pct"], transactions, sem);
}

console.log("== Transactions reelles : revenus et depenses separes correctement ==");
const normal = calc([
  { date: "2026-03-01", amount: 10000, type: "income" },
  { date: "2026-03-10", amount: 4000, type: "expense" },
  { date: "2026-04-01", amount: 12000, type: "income" },
  { date: "2026-04-10", amount: 5000, type: "expense" },
]);
t(normal.get("total_revenue")?.value === 22000, `total_revenue = ${normal.get("total_revenue")?.value} (attendu 22000, pas de melange avec les depenses)`);
t(normal.get("total_expense")?.value === 9000, `total_expense = ${normal.get("total_expense")?.value} (attendu 9000)`);
t(normal.get("net_income")?.value === 13000, `net_income = ${normal.get("net_income")?.value} (attendu 13000 = 22000-9000)`);
t(Math.round((normal.get("net_margin_pct")?.value || 0) * 100) / 100 === 59.09, `net_margin_pct = ${normal.get("net_margin_pct")?.value} (attendu ~59.09%)`);

console.log("\n== Revenus seuls, aucune depense importee : net_income non mesurable, jamais 100% ==");
const revenuSeul = calc([
  { date: "2026-03-01", amount: 10000, type: "income" },
  { date: "2026-04-01", amount: 12000, type: "income" },
]);
t(revenuSeul.get("total_revenue")?.value === 22000, `total_revenue = ${revenuSeul.get("total_revenue")?.value} (attendu 22000)`);
t(revenuSeul.get("net_income")?.value === null, `net_income = ${revenuSeul.get("net_income")?.value} (attendu null, jamais 22000 comme si les depenses etaient nulles)`);
t(revenuSeul.get("net_margin_pct")?.value === null, `net_margin_pct = ${revenuSeul.get("net_margin_pct")?.value} (attendu null, jamais 100%)`);

console.log("\n== Perte reelle : le signe negatif est preserve ==");
const perte = calc([
  { date: "2026-03-01", amount: 5000, type: "income" },
  { date: "2026-03-10", amount: 9000, type: "expense" },
]);
t(perte.get("net_income")?.value === -4000, `net_income = ${perte.get("net_income")?.value} (attendu -4000)`);
t(perte.get("net_margin_pct")?.value === -80, `net_margin_pct = ${perte.get("net_margin_pct")?.value} (attendu -80%)`);

console.log("\n== Aucune transaction : tout reste non mesurable, aucun crash ==");
const vide = calc([]);
t(vide.get("total_revenue")?.value === null && vide.get("net_income")?.value === null,
  `dataset vide -> total_revenue=${vide.get("total_revenue")?.value}, net_income=${vide.get("net_income")?.value} (attendu null partout)`);

console.log("\ncas en echec :", e);
