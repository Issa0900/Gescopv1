// Cas reel signale par l'utilisateur (2026-09-17) : sur son fichier reel
// Nordik_PleinAir_Donnees_Complet_2026.xlsx (1200 lignes de ventes), la
// colonne "Montant Total ($)" est vide sur 100% des lignes -- mais "Prix
// Unitaire ($)" et "Quantite" sont remplies sur 100% des lignes. Le Dashboard
// affichait "CA commandes (total): 0$" alors que "Commandes (mois): 40"
// prouvait que les lignes etaient bien lues.
//
// Cause : importUtils.ts alias deja "Montant Total"/"Total Spent" vers le
// champ brut total_revenue (pas une faute de frappe pour `total` -- c'est un
// vrai champ separe du schema Order), et son hook de secours derive deja
// total_revenue = quantite * prix_unitaire quand le fichier le laisse vide
// (ligne ~2024-2029 de importUtils.ts). Le vrai trou : entityFieldMap.js ne
// savait pas que "total_revenue" existait -- seul "total" etait mappe au
// canonicalKey "revenue" que le moteur KPI utilise. La valeur derivee etait
// donc bien calculee et stockee, mais invisible pour tout calcul de revenu.
import { normalizeKeys, normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";
import { computeKpiBatch } from "../../src/lib/core/kpiEngine.js";
import { getEntitySemantics } from "../../src/lib/core/entityFieldMap.js";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Order")!;

console.log("== normalizeRow : total_revenue derive de quantite*prix quand 'Montant Total' est vide ==");
const brut1 = {
  "ID Transaction": "V-10001",
  "Date": "2026-01-01",
  "ID Client": "C-88124",
  "Quantité": 2,
  "Prix Unitaire ($)": 45,
  "Coût Unitaire ($)": 18,
  "Montant Total ($)": "",
};
const cle1 = normalizeKeys(brut1, schema.properties);
const norm1 = normalizeRow("Order", cle1, "imp-1", schema.properties);
t(missingRequired(norm1, schema.required).length === 0, "la ligne n'est pas rejetee pour un champ obligatoire manquant");
t(norm1.total_revenue === 90, `total_revenue derive = ${norm1.total_revenue} (attendu 90 = 2 x 45)`);

console.log("\n== Le moteur KPI voit ce total_revenue derive (avant le correctif : null) ==");
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

const orders = [
  { order_id: "V-10001", date: "2026-01-01", customer_id: "C-88124", quantity: 2, unit_price: 45, unit_cost: 18, total_revenue: 90 },
  { order_id: "V-10002", date: "2026-01-01", customer_id: "C-88021", quantity: 1, unit_price: 35, unit_cost: 12.5, total_revenue: 35 },
  { order_id: "V-10003", date: "2026-01-01", customer_id: "C-88052", quantity: 4, unit_price: 189.99, unit_cost: 85, total_revenue: 759.96 },
];
const { allRecords, allSemantics } = flatten({ Order: orders });
const kpis = computeKpiBatch(["total_revenue"], allRecords, allSemantics);
const attendu = 90 + 35 + 759.96;
t(kpis.get("total_revenue")?.value === attendu, `total_revenue = ${kpis.get("total_revenue")?.value} (attendu ${attendu}, pas null)`);

console.log("\n== Non-regression : un fichier avec 'total' deja rempli (colonne classique) fonctionne toujours ==");
const ordersClassiques = [
  { order_id: "CMD-1", date: "2026-08-01", customer_id: "C-1", total: 690.33, cost: 324.69 },
  { order_id: "CMD-2", date: "2026-08-02", customer_id: "C-2", total: 164.84, cost: 87.03 },
];
const flat2 = flatten({ Order: ordersClassiques });
const kpis2 = computeKpiBatch(["total_revenue"], flat2.allRecords, flat2.allSemantics);
t(Math.round((kpis2.get("total_revenue")?.value || 0) * 100) / 100 === 855.17, `total_revenue = ${kpis2.get("total_revenue")?.value} (attendu 855.17, chemin 'total' toujours fonctionnel)`);

console.log("\ncas en echec :", e);
