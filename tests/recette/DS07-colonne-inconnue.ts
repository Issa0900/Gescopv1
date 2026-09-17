// Reconstruction du cas "colonne inconnue" / "colonne supplementaire"
// (sec3/sec6 de l'audit) : une colonne que le moteur ne sait pas relier a
// un champ de l'entite ne doit pas disparaitre sans explication.
import { normalizeKeys, normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;

// Colonne totalement inconnue, sans rapport avec aucun concept metier.
const unmapped = new Set<string>();
const row = { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Reference Interne XYZ-42": "abc" };
const mapped = normalizeKeys(row, schema.properties, unmapped);
t(unmapped.has("Reference Interne XYZ-42"),
  `colonne inconnue tracee dans "unmapped" : ${JSON.stringify(Array.from(unmapped))}`);
t(mapped.date !== undefined || row.Date !== undefined,
  `les colonnes reconnues du reste de la ligne ne sont pas affectees par la colonne inconnue`);

// Le pipeline complet (normalizeRow) doit aussi la tracer, sans la laisser
// perturber le montant/la date qui, eux, sont bien reconnus.
const unmapped2 = new Set<string>();
const n = normalizeRow("Transaction", row, "imp-1", schema.properties, "csv", [], unmapped2);
t(unmapped2.has("Reference Interne XYZ-42"),
  `normalizeRow relaie la colonne inconnue : ${JSON.stringify(Array.from(unmapped2))}`);
t(n.amount === 500 && n.date === "2026-03-01",
  `montant et date corrects malgre la colonne en trop : amount=${n.amount} date=${n.date}`);

// Colonne connue -> ne doit jamais apparaitre comme "inconnue".
const unmapped3 = new Set<string>();
normalizeKeys({ "Date": "2026-03-01", "Montant": "500" }, schema.properties, unmapped3);
t(unmapped3.size === 0, `aucune fausse alerte quand toutes les colonnes sont reconnues : ${JSON.stringify(Array.from(unmapped3))}`);

console.log("\ncas en echec :", e);
