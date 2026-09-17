// Chantier 1 (spec v2, section 3) : verifie que le registre unique
// (registry/conceptRegistry.ts) est bien la source des tables legacy, et
// regression du bug "Facebook Ads ignore" : une colonne nommee "Facebook Ads"
// doit maintenant resoudre vers un concept de mesure au lieu de disparaitre.
import { matchConcept } from "../../base44/shared/semanticMatcher.ts";
import { FIELD_ALIASES, ALIAS_CANONIQUES, normalizeKeys, cleCanonique } from "../../base44/shared/importUtils.ts";
import { buildFieldAliasesFromRegistry, findConceptByHeaderName } from "../../base44/shared/registry/generateAliases.ts";
import { CONCEPTS } from "../../base44/shared/registry/conceptRegistry.ts";

let ko = 0;
const fail = (label: string, detail: string) => {
  ko++;
  console.log(`KO   ${label} -- ${detail}`);
};
const pass = (label: string) => console.log(`ok   ${label}`);

console.log("=== registre -> ALIAS_CANONIQUES (aucune divergence sur ce que le registre exporte) ===");
const genere = buildFieldAliasesFromRegistry();
for (const [cle, cible] of Object.entries(genere)) {
  const actuel = FIELD_ALIASES[cle] ?? ALIAS_CANONIQUES[cle];
  if (actuel === cible) pass(`${cle} -> ${cible}`);
  else fail(cle, `attendu ${cible}, trouve ${actuel}`);
}

console.log("\n=== regression bug 'Facebook Ads ignore' (en-tete, pas valeur de cellule) ===");

// 1. Le registre lui-meme doit connaitre "Facebook Ads" comme concept de mesure.
{
  const r = findConceptByHeaderName("Facebook Ads");
  if (r && r.canonicalKey === "advertising_spend") pass("findConceptByHeaderName('Facebook Ads') -> advertising_spend");
  else fail("findConceptByHeaderName", `resultat = ${JSON.stringify(r)}`);
}

// 2. matchConcept (semanticMatcher.ts, Phase 1 pipeline reellement branchee en
//    production sur importMultiData/entry.ts) doit reconnaitre l'en-tete.
{
  const match = matchConcept({ columnName: "Facebook Ads", inferredType: "currency" } as any);
  if (match && match.concept === "marketing.spend") pass("matchConcept({columnName:'Facebook Ads'}) -> marketing.spend");
  else fail("matchConcept", `resultat = ${JSON.stringify(match)}`);
}

// 3. Le chemin reel de commit (normalizeKeys, importUtils.ts) ne doit plus
//    faire disparaitre la colonne : avant ce chantier, "Facebook Ads" n'avait
//    d'alias nulle part et retombait sur sa forme brute normalisee, souvent
//    filtree ensuite comme hors-schema.
{
  const row = normalizeKeys({ "Facebook Ads": "1200" }, { advertising_spend: { type: "number" } });
  if (row.advertising_spend === "1200") pass("normalizeKeys({'Facebook Ads':...}) -> advertising_spend conserve");
  else fail("normalizeKeys", `resultat = ${JSON.stringify(row)}`);
}

// 4. Sanity : la cle canonique attendue par ALIAS_CANONIQUES correspond bien
//    a ce que cleCanonique() produit pour "Facebook Ads" (evite une regression
//    silencieuse si la normalisation change un jour).
{
  const canon = cleCanonique("Facebook Ads");
  if (canon === "facebook_ads") pass(`cleCanonique('Facebook Ads') -> ${canon}`);
  else fail("cleCanonique", `resultat = ${canon}`);
}

console.log(`\nconcepts dans le registre : ${Object.keys(CONCEPTS).length}`);
console.log("\ncas en echec :", ko);
if (ko > 0) Deno.exit(1);
