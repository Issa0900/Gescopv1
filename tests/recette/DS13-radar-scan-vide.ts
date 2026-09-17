// sec8 de l'audit : un scan radar qui ne trouve aucun signal exploitable ne
// doit jamais effacer l'historique existant. Le code produisait deja ce
// message pour un echec de parsing LLM ("Vos donnees actuelles sont
// conservees") mais pas pour le cas ou le parsing reussit tout en filtrant
// tous les signaux (URL invalide, score sous 50...).
import { filterSignals } from "../../base44/functions/scanExternalRadar/entry.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const company = { location: "Québec" };
const today = "2026-09-17";

console.log("== Filtrage des signaux ==");
const signauxBruts = [
  { title: "Hausse des couts de transport", url: "https://exemple.com/a", relevance_score: 80, family: "economy", fact: "f", inference: "i", monitoring_tip: "m", source: "Radio-Canada" },
  { title: "Sans URL valide", url: "pas-une-url", relevance_score: 90 }, // rejete
  { title: "Score trop bas", url: "https://exemple.com/b", relevance_score: 20 }, // rejete
  { title: "", url: "https://exemple.com/c", relevance_score: 90 }, // rejete (pas de titre)
];
const gardes = filterSignals(signauxBruts, company, today);
t(gardes.length === 1, `4 signaux bruts -> ${gardes.length} conserve(s) (attendu 1, les 3 autres invalides)`);
t(gardes[0].title === "Hausse des couts de transport", "le signal valide garde son titre");
t(gardes[0].family === "economy", "la famille valide (economy) est preservee");

console.log("\n== Scan qui ne trouve rien : ne doit rien effacer (verifie au niveau du filtrage) ==");
const rienDExploitable = [
  { title: "Bruit", url: "pas-une-url", relevance_score: 10 },
];
const gardes2 = filterSignals(rienDExploitable, company, today);
t(gardes2.length === 0, `signal inexploitable -> 0 conserve (le handler doit alors NE PAS appeler deleteMany)`);

console.log("\ncas en echec :", e);
