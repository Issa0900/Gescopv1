// Cas reel signale par l'utilisateur (2026-09-17) : sur son fichier reel
// DS02_commandes_ecommerce_6mois.xlsx (4659 commandes, 1 301 611 $ de
// montant_ttc), le Dashboard affichait "Chiffre d'affaires: 92 534 $" - une
// fraction du vrai total. La cause : total_revenue traitait le revenu des
// commandes (canonicalKey "revenue", via Order.total) comme une TROISIEME
// alternative au meme rang que income_amount/transaction_amount (Transaction),
// alors que ce sont deux sources reellement distinctes (e-commerce vs
// operations manuelles) qui doivent s'additionner. Des qu'une seule ligne de
// Transaction income existait, elle ecrasait entierement le revenu des
// commandes, quelle que soit sa taille relative.
import { computeKpiBatch } from "../../src/lib/core/kpiEngine.js";
import { getEntitySemantics } from "../../src/lib/core/entityFieldMap.js";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

function flatten(entities: Record<string, any[]>) {
  const allRecords: any[] = [];
  const allSemantics = new Map();
  for (const [entityName, records] of Object.entries(entities)) {
    allRecords.push(...records.map((r) => ({ ...r, _entity: entityName })));
    const sem = getEntitySemantics(entityName);
    if (sem) sem.forEach((v, k) => allSemantics.set(`${entityName}:${k}`, v));
  }
  return { allRecords, allSemantics };
}

console.log("== Reproduction du cas reel : 3 commandes (986$) + 1 petite transaction income (150$) ==");
{
  const orders = [
    { order_id: "CMD-1", date: "2026-08-01", customer_id: "C-1", total: 690.33, cost: 324.69 },
    { order_id: "CMD-2", date: "2026-08-02", customer_id: "C-2", total: 164.84, cost: 87.03 },
    { order_id: "CMD-3", date: "2026-08-03", customer_id: "C-3", total: 131.0, cost: 60.0 },
  ];
  const transactions = [
    { date: "2026-08-05", amount: 150, type: "income", description: "Vente comptoir hors systeme" },
  ];
  const { allRecords, allSemantics } = flatten({ Order: orders, Transaction: transactions });
  const kpis = computeKpiBatch(["total_revenue"], allRecords, allSemantics);
  const totalRevenue = kpis.get("total_revenue")?.value;
  const ordersTotal = orders.reduce((s, o) => s + o.total, 0);
  const expected = ordersTotal + 150;
  t(totalRevenue === expected, `total_revenue = ${totalRevenue} (attendu ${expected} = ${ordersTotal} commandes + 150 transaction, PAS juste 150)`);
}

console.log("\n== Transaction seule sans commande : total_revenue reste correct (pas de regression) ==");
{
  const transactions = [
    { date: "2026-08-01", amount: 10000, type: "income" },
    { date: "2026-08-05", amount: 4000, type: "expense" },
  ];
  const { allRecords, allSemantics } = flatten({ Transaction: transactions });
  const kpis = computeKpiBatch(["total_revenue"], allRecords, allSemantics);
  t(kpis.get("total_revenue")?.value === 10000, `total_revenue = ${kpis.get("total_revenue")?.value} (attendu 10000, transactions seules)`);
}

console.log("\n== Commandes seules sans transaction : total_revenue reste correct (pas de regression) ==");
{
  const orders = [
    { order_id: "CMD-1", date: "2026-08-01", customer_id: "C-1", total: 500 },
    { order_id: "CMD-2", date: "2026-08-02", customer_id: "C-2", total: 300 },
  ];
  const { allRecords, allSemantics } = flatten({ Order: orders });
  const kpis = computeKpiBatch(["total_revenue"], allRecords, allSemantics);
  t(kpis.get("total_revenue")?.value === 800, `total_revenue = ${kpis.get("total_revenue")?.value} (attendu 800)`);
}

console.log("\n== Aucune donnee : total_revenue reste non mesurable, pas 0 invente ==");
{
  const { allRecords, allSemantics } = flatten({});
  const kpis = computeKpiBatch(["total_revenue"], allRecords, allSemantics);
  t(kpis.get("total_revenue") === undefined || kpis.get("total_revenue")?.value == null, "total_revenue = null/absent sur un jeu de donnees vide");
}

console.log("\ncas en echec :", e);
