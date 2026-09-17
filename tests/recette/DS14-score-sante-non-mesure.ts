// sec9-11 de l'audit : un domaine "Non mesure" ne doit jamais contribuer au
// score global comme s'il avait une bonne (ou mauvaise) performance. Avant
// ce correctif, le LLM inventait un score de santé global integrant TOUTES
// les dimensions, mesurees ou non -- un score 0-100 fantome pour un domaine
// vide faussait la moyenne. Desormais le serveur calcule lui-meme la
// moyenne, sur les seules dimensions measured=true.
import { computeHealthScore } from "../../base44/functions/analyzeBusiness/entry.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

console.log("== Toutes les dimensions mesurees (cas normal) ==");
t(computeHealthScore([
  { name: "finance", score: 80, measured: true },
  { name: "ventes", score: 60, measured: true },
]) === 70, "moyenne simple de 2 dimensions mesurees = 70");

console.log("\n== Une dimension non mesuree ne doit PAS tirer la moyenne vers le bas ==");
const avecNonMesure = computeHealthScore([
  { name: "finance", score: 80, measured: true },
  { name: "ventes", score: 60, measured: true },
  { name: "marketing", score: 0, measured: false }, // aucune donnee marketing importee
]);
t(avecNonMesure === 70,
  `finance=80 + ventes=60, marketing non mesure exclu -> ${avecNonMesure} (attendu 70, PAS 46.6 si le 0 comptait)`);

console.log("\n== Toutes les dimensions non mesurees : jamais un score fantome ==");
const aucuneMesure = computeHealthScore([
  { name: "finance", score: 0, measured: false },
  { name: "ventes", score: 0, measured: false },
]);
t(aucuneMesure === null, `aucune dimension mesuree -> ${aucuneMesure} (attendu null, jamais 0 ou un score invente)`);

console.log("\n== Compatibilite : flag 'measured' absent (LLM qui n'a pas suivi l'instruction a la lettre) ==");
const sansFlag = computeHealthScore([
  { name: "finance", score: 90 }, // pas de champ measured du tout
]);
t(sansFlag === 90, `dimension sans flag measured -> ${sansFlag} (attendu 90 : traitee comme mesuree, pas exclue a tort)`);

console.log("\n== Un score non nul mais measured=false reste exclu (le flag prime, pas le score) ==");
const scoreIgnoreSiNonMesure = computeHealthScore([
  { name: "finance", score: 80, measured: true },
  { name: "tresorerie", score: 95, measured: false }, // le LLM a quand meme mis un score malgre l'instruction
]);
t(scoreIgnoreSiNonMesure === 80,
  `tresorerie=95 mais measured=false -> ${scoreIgnoreSiNonMesure} (attendu 80, le score de 95 ne doit jamais compter)`);

console.log("\ncas en echec :", e);
