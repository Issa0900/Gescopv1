// Garde-fou structurel n2 : chaque champ NUMERIQUE declare dans un schema
// d'entite (entitySchemas.ts) doit etre soit mappe dans entityFieldMap.js
// (donc visible au moteur KPI), soit explicitement liste ci-dessous avec une
// raison -- jamais silencieusement absent. C'est le meme principe que DS18,
// applique un cran plus tot : DS18 garantit qu'une dependance de KPI pointe
// vers un champ reel ; celui-ci garantit qu'un champ reel qui MERITE d'etre
// visible au moteur ne soit jamais oublie sans que ce soit une decision
// consciente et documentee.
//
// Trouve par cet audit (2026-09-17) en verifiant "est-ce que tout est
// mappe ?" : la plupart des champs non mappes sont categoriels (statut, nom,
// region...) et n'ont pas a l'etre -- filtres ici par type "number" du
// schema. Parmi les champs numeriques restants, aucun n'a de KPI qui en
// depende aujourd'hui (verifie), donc aucun ne cause de bug visible comme
// total_revenue -- mais les lister explicitement, avec une raison, empeche
// qu'un futur champ numerique important tombe dans le meme trou sans que
// personne ne le remarque.
import { ENTITY_SCHEMAS } from "../../base44/shared/entitySchemas.ts";
import { ENTITY_FIELD_MAP } from "../../src/lib/core/entityFieldMap.js";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const BUILTIN = new Set(["id", "import_id", "fingerprint", "original_data", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"]);

// entite.champ -> raison de l'absence volontaire. Ajouter une ligne ici est
// une decision consciente, pas un oubli -- si un KPI se met a en dependre un
// jour, il faudra retirer l'entree ET ajouter le mapping (DS18 le forcera de
// toute facon, puisque le nouveau canonicalKey ne matchera rien).
const GAPS_CONNUS: Record<string, string> = {
  "Order.unit_cost": "taux par unite, pas un total -- cost/total_cost (cogs) couvrent deja le montant total reel",
  "Order.gross_profit": "doublon exact de gross_margin_amount deja calcule par le moteur KPI (total_revenue - cogs) ; aucun KPI n'en depend directement",
  "Customer.average_order_value": "moyenne par client -- une somme brute a travers plusieurs clients serait fausse (il faudrait une moyenne ponderee) ; aov est deja calcule par le moteur depuis Order",
  "Inventory.purchases": "quantite de flux, aucun KPI actuel n'en depend -- a mapper avec le bon type semantique quand un besoin reel apparait",
  "Inventory.units_sold": "idem -- deja couvert indirectement par Order.quantity pour les vraies ventes",
  "Inventory.returns": "idem, aucun KPI actuel n'en depend",
  "Inventory.damaged": "idem, aucun KPI actuel n'en depend",
  "Inventory.days_in_inventory": "idem, aucun KPI actuel n'en depend",
  "Inventory.unit_cost": "taux au niveau ligne, deja couvert par Product.purchase_cost au niveau produit",
  "Inventory.selling_price": "taux au niveau ligne, deja couvert par Product.selling_price au niveau produit",
  "Employee.annual_salary": "consomme indirectement : le hook de secours d'importUtils.ts le convertit deja en hourly_rate, qui lui est mappe",
  "Employee.salary": "alias potentiel d'annual_salary, non consomme directement, aucun KPI n'en depend",
  "CampaignDaily.reach": "aucun KPI actuel n'en depend",
  "CampaignDaily.cpc": "le KPI cpc calcule sa propre valeur depuis campaign_budget/campaign_clicks (deja mappes) plutot que de lire une colonne pre-fournie ; aucun KPI n'en depend directement",
  "CampaignDaily.ctr": "calculable depuis clicks/impressions (deja mappes) si un jour necessaire ; aucun KPI n'en depend directement aujourd'hui",
  "CampaignDaily.conversion_rate": "idem, calculable depuis conversions/clicks deja mappes",
  "Supplier.purchase_volume": "aucun KPI actuel n'en depend",
  "Supplier.price_change_last_12_months": "aucun KPI actuel n'en depend",
  "Purchase.delay_days": "aucun KPI actuel n'en depend",
  "Interaction.satisfaction_score": "aucun KPI actuel n'en depend",
  "Competitor.average_rating": "entite de veille concurrentielle affichee telle quelle, pas agregee par le moteur KPI",
  "Competitor.employee_count": "idem",
  "Competitor.estimated_revenue": "idem",
  "Goal.target": "lu directement par la page Objectifs, pas via le moteur KPI",
  "Goal.current": "idem",
  "ExternalSignal.relevance_score": "lu directement par la logique de filtrage du radar (filterSignals), pas via le moteur KPI",
  // ExecutiveSummary : toute l'entite est du code mort (jamais branchee a
  // aucune page ni fonction) -- deja documente dans AUDIT-LOG.md.
  "ExecutiveSummary.total_revenue": "entite ExecutiveSummary entierement non utilisee dans l'app (code mort documente)",
  "ExecutiveSummary.total_cost": "idem",
  "ExecutiveSummary.gross_profit": "idem",
  "ExecutiveSummary.gross_margin": "idem",
  "ExecutiveSummary.total_orders": "idem",
};

console.log("== chaque champ numerique est mappe, ou son absence est documentee ==");
let numericFields = 0;
for (const [entity, schema] of Object.entries(ENTITY_SCHEMAS) as any[]) {
  const mapped = new Set(Object.keys((ENTITY_FIELD_MAP as any)[entity] || {}));
  for (const [field, def] of Object.entries(schema.properties || {}) as any[]) {
    if (BUILTIN.has(field) || def?.type !== "number") continue;
    numericFields++;
    const key = `${entity}.${field}`;
    const ok = mapped.has(field) || key in GAPS_CONNUS;
    t(ok, `${key} : mappe, ou absence documentee dans GAPS_CONNUS`);
  }
}
console.log(`(${numericFields} champs numeriques verifies au total)`);

console.log("\n== aucune entree de GAPS_CONNUS n'est perimee (champ deja mappe entre-temps) ==");
for (const key of Object.keys(GAPS_CONNUS)) {
  const [entity, field] = key.split(".");
  const mapped = new Set(Object.keys((ENTITY_FIELD_MAP as any)[entity] || {}));
  t(!mapped.has(field), `${key} : toujours non mappe (sinon retirer cette entree)`);
}

console.log("\ncas en echec :", e);
