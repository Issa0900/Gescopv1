// Reconstruction : "generateReport" comparant deux periodes -- si la periode
// courante n'a AUCUNE transaction importee alors que la precedente avait de
// vraies donnees, une comparaison naive dit "-100%" (marge effondree) alors
// que la verite est "donnee non importee ce mois-ci" (sec10/sec16 de l'audit).
import { computeMetrics, buildComparison, comparisonToText } from "../../base44/functions/generateReport/entry.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

function ctxAvec(transactions: any[]) {
  return { transactions, orders: [], customers: [], campaigns: [], cashflow: [] };
}

const now = new Date("2026-04-15T00:00:00Z");

console.log("== Mois courant vide, mois precedent avec de vraies transactions ==");
const transactionsMarsSeulement = [
  { date: "2026-03-05", type: "income", amount: 10000 },
  { date: "2026-03-10", type: "expense", amount: 5500 },
];
const comparaison = buildComparison(ctxAvec(transactionsMarsSeulement), "month", now);
const margePct = comparaison.metrics.find((m: any) => m.key === "margePct");
t(margePct.trend === "non-mesurable",
  `margePct.trend = "${margePct.trend}" (attendu "non-mesurable", jamais un delta -100% invente)`);
t(margePct.deltaPct === null, `margePct.deltaPct = ${margePct.deltaPct} (attendu null, pas -100)`);

const texte = comparisonToText(comparaison);
t(!/−?-?100%/.test(texte.split("\n").find((l: string) => l.startsWith("Marge %")) || ""),
  `le texte du rapport ne dit jamais "-100%" pour la marge : "${texte.split("\n").find((l: string) => l.startsWith("Marge %"))}"`);
t(/Marge %: non mesurable/.test(texte), `le texte dit explicitement "non mesurable" pour la marge`);

console.log("\n== Non-regression : deux periodes avec de vraies donnees ==");
const marsEtAvril = [
  { date: "2026-03-05", type: "income", amount: 10000 },
  { date: "2026-03-10", type: "expense", amount: 5500 },
  { date: "2026-04-05", type: "income", amount: 12000 },
  { date: "2026-04-10", type: "expense", amount: 6000 },
];
const comparaison2 = buildComparison(ctxAvec(marsEtAvril), "month", now);
const margePct2 = comparaison2.metrics.find((m: any) => m.key === "margePct");
t(margePct2.trend !== "non-mesurable" && typeof margePct2.deltaPct === "number",
  `deux periodes reellement mesurees -> comparaison normale (trend=${margePct2.trend}, deltaPct=${margePct2.deltaPct})`);

console.log("\ncas en echec :", e);
