// Reconstruction du cas "charge" (sec12 de l'audit) : generer un gros
// volume de lignes realistes (bonnes + mauvaises, comme un vrai export) et
// verifier l'invariant central du moteur de donnees (sec5) :
//   lignes detectees = lignes traitees = lignes valides + lignes rejetees
// aucune ligne ne doit disparaitre entre la lecture et le resultat final.
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;

function genererLignes(n: number) {
  const lignes: Record<string, any>[] = [];
  for (let i = 0; i < n; i++) {
    const jour = String((i % 28) + 1).padStart(2, "0");
    const mois = String((i % 12) + 1).padStart(2, "0");
    // 1 ligne sur 7 est volontairement invalide (montant illisible), comme
    // dans un vrai export avec des cellules corrompues.
    const casse = i % 7 === 0;
    lignes.push({
      "Date": `${jour}/${mois}/2026`,
      "Montant": casse ? "texte-invalide" : String((i % 500) + 1),
      "Type": i % 2 === 0 ? "Revenu" : "Depense",
      "Description": `Transaction ${i}`,
    });
  }
  return lignes;
}

for (const N of [1000, 10000]) {
  const lignes = genererLignes(N);
  const debut = Date.now();
  let valides = 0;
  let rejetees = 0;
  for (const row of lignes) {
    const n = normalizeRow("Transaction", row, "imp-charge", schema.properties, "csv", []);
    const manque = missingRequired(n, schema.required);
    if (manque.length === 0) valides++; else rejetees++;
  }
  const dureeMs = Date.now() - debut;
  const attenduRejetees = Math.ceil(N / 7); // i % 7 === 0
  const attenduValides = N - attenduRejetees;

  t(valides + rejetees === N,
    `N=${N} : invariant lues=traitees -> ${valides}+${rejetees}=${valides + rejetees} (attendu ${N})`);
  t(rejetees === attenduRejetees,
    `N=${N} : lignes rejetees = ${rejetees} (attendu ${attenduRejetees}, une ligne sur 7 a montant invalide)`);
  t(valides === attenduValides,
    `N=${N} : lignes valides = ${valides} (attendu ${attenduValides})`);
  console.log(`   -> N=${N} traite en ${dureeMs} ms (${(N / Math.max(dureeMs, 1) * 1000).toFixed(0)} lignes/s)`);
  t(dureeMs < 10000, `N=${N} : temps de traitement raisonnable (${dureeMs} ms < 10000 ms)`);
}

console.log("\ncas en echec :", e);
