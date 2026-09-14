import { monthlyAggComplete, sumLast, sumPrev, lastVal, trendPct, currentMonthKey } from "../../src/lib/periods.js";
import { aggregateMarginPct, previousMarginPct, netBurnRate, runwayMonths, fmtRunway } from "../../src/lib/metrics.js";

const mois = (n) => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-n); return d.toISOString().slice(0,7); };
const lignes = (paires) => paires.map(([m,v]) => ({ date: m+"-15", amount: v }));

console.log("mois en cours :", currentMonthKey());

console.log("\n=== 1. Serie a jour (donnees jusqu'au mois dernier) ===");
let s = monthlyAggComplete(lignes([[mois(3),1000],[mois(2),1100],[mois(1),1200]]), "date", "amount");
console.log("  buckets:", s.map(x=>x.month+":"+x.val).join(" "));
console.log("  dernier mois complet ->", lastVal(s), "| somme 3 mois ->", sumLast(s,3));

console.log("\n=== 2. Serie PERIMEE (plus rien depuis 4 mois) ===");
s = monthlyAggComplete(lignes([[mois(6),1000],[mois(5),1100],[mois(4),1200]]), "date", "amount");
console.log("  buckets:", s.map(x=>x.month+":"+x.val).join(" "));
console.log("  dernier mois complet ->", lastVal(s), "<-- devrait etre 0 :", mois(1), "n'a aucune donnee");
console.log("  somme 3 mois ->", sumLast(s,3), "<-- couvre", s.length, "mois reels, pas les 3 derniers");

console.log("\n=== 3. Trou au milieu de la serie ===");
s = monthlyAggComplete(lignes([[mois(5),1000],[mois(1),1200]]), "date", "amount");
console.log("  buckets:", s.map(x=>x.month+":"+x.val).join(" "), "(densifie:", s.length, "mois)");

console.log("\n=== 4. Marge et fenetres ===");
const rev = monthlyAggComplete(lignes([[mois(6),10000],[mois(5),10000],[mois(4),10000],[mois(3),20000],[mois(2),20000],[mois(1),20000]]), "date", "amount");
const exp = monthlyAggComplete(lignes([[mois(6),9000],[mois(5),9000],[mois(4),9000],[mois(3),15000],[mois(2),15000],[mois(1),15000]]), "date", "amount");
console.log("  marge 3 derniers mois :", aggregateMarginPct(rev,exp,3).toFixed(1), "% (attendu 25.0)");
console.log("  marge 3 mois precedents:", previousMarginPct(rev,exp,3).toFixed(1), "% (attendu 10.0)");

console.log("\n=== 5. Autonomie de tresorerie ===");
const burn = netBurnRate(rev, exp, 3);
console.log("  burn net mensuel :", burn, "| runway avec 50 000 $ :", fmtRunway(runwayMonths(50000, burn)));
console.log("  runway avec tresorerie NEGATIVE (-20 000) :", fmtRunway(runwayMonths(-20000, burn)), "<-- entreprise a decouvert");

console.log("\n=== 6. trendPct sur base nulle ou negative ===");
console.log("  trendPct(100, 0) =", trendPct(100,0), "| trendPct(100,-50) =", trendPct(100,-50), "| trendPct(0,100) =", trendPct(0,100));
