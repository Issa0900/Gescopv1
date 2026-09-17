// Garde-fou structurel : chaque `dependencies` declare dans KPI_REGISTRY doit
// correspondre a un canonicalKey qu'au moins un champ d'entityFieldMap.js
// produit reellement (directement, via contextRules, ou via defaultFallback),
// ou a l'id d'un autre KPI du registre.
//
// Trouve par cet audit meme (2026-09-17), sur de vraies donnees utilisateur
// qui ont revele le premier cas (total_revenue) : 6 autres KPI (total_expense,
// cash_runway, bfr, dso, dpo) dependaient de cles qui n'existaient nulle part
// ("expense", "cash_balance", "receivable", "payable", "clicks",
// "impressions" au lieu de "accounts_receivable"/"accounts_payable"/
// "cash_closing"/"campaign_clicks"/"campaign_impressions") -- ces KPI ne
// pouvaient JAMAIS calculer une vraie valeur, silencieusement, meme avec de
// vraies donnees importees. Ce test transforme la verification manuelle en
// garde-fou permanent : plus besoin qu'un vrai fichier utilisateur revele le
// trou par hasard, il echoue des la prochaine execution des tests.
import { ENTITY_FIELD_MAP } from "../../src/lib/core/entityFieldMap.js";
import { KPI_REGISTRY } from "../../src/lib/core/kpiRegistry.js";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const allCanonicalKeys = new Set<string>();
for (const entity of Object.values(ENTITY_FIELD_MAP) as any[]) {
  for (const fieldDef of Object.values(entity) as any[]) {
    if (fieldDef.canonicalKey) allCanonicalKeys.add(fieldDef.canonicalKey);
    if (fieldDef.contextRules) for (const r of fieldDef.contextRules) allCanonicalKeys.add(r.then.canonicalKey);
    if (fieldDef.defaultFallback) allCanonicalKeys.add(fieldDef.defaultFallback.canonicalKey);
  }
}
for (const id of Object.keys(KPI_REGISTRY)) allCanonicalKeys.add(id);

console.log(`== ${Object.keys(KPI_REGISTRY).length} KPI, ${allCanonicalKeys.size} canonicalKeys connus ==`);
for (const [kpiId, def] of Object.entries(KPI_REGISTRY) as any[]) {
  for (const dep of (def.dependencies || [])) {
    t(allCanonicalKeys.has(dep), `${kpiId} -> dependance "${dep}" resolue par un vrai champ ou un autre KPI`);
  }
}

console.log("\ncas en echec :", e);
