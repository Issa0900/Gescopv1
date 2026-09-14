// Un seul fichier volontairement sale, qui cumule 5 defauts a la fois.
// Les defauts isoles etaient couverts un par un ; leur COMBINAISON ne l'etait
// pas, et c'est elle qui a revele que le separateur etait devine sur la
// premiere ligne du fichier (donc sur le titre, qui n'en contient aucun).
import { parseDelimitedText } from "../../base44/shared/csvParse.ts";
import { detectEntityByName } from "../../base44/shared/sheetDetect.ts";
// La vraie fonction de classement du point d'entree, pas une copie : c'est elle
// qui arbitre entre le nom du fichier et les colonnes, et c'est cet arbitrage
// qu'il faut verifier.
import { detect } from "../../base44/functions/importMultiData/entry.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

const FICHIER =
  "Rapport de ventes - mars 2026\n" +   // titre avant les en-tetes
  "\n" +                                 // ligne vide
  "Date opération;Montant;Type;Catégorie\n" + // separateur point-virgule (Excel FR)
  "01/03/2026;1 500,00 $;Revenu;Ventes\n" +   // montant francais + devise
  "31/02/2026;800,00 $;Revenu;Ventes\n" +     // date impossible
  "03/03/2026;'1000;Dépense;Fournitures\n" +  // nombre stocke en texte
  "04/03/2026;;Revenu;Ventes\n";              // montant absent

const rows = parseDelimitedText(FICHIER);
const entetes = rows.length ? Object.keys(rows[0]) : [];
const { entity: entite, via } = detect("ventes.csv", entetes, detectEntityByName("ventes.csv"), null);

console.log("=== LECTURE DU FICHIER ===");
console.log("  lignes de donnees lues :", rows.length);
console.log("  en-tetes reconnus      :", JSON.stringify(entetes));
console.log("  type detecte           :", entite, "(via", via + ")");

const schema = getSchema("Transaction")!;
const acceptees: any[] = []; const rejetees: any[] = [];
console.log("\n=== LIGNE PAR LIGNE ===");
rows.forEach((r, i) => {
  const n = normalizeRow("Transaction", r, "imp", schema.properties, "csv", []);
  const manque = missingRequired(n, schema.required);
  const ok = manque.length === 0;
  (ok ? acceptees : rejetees).push(n);
  console.log(`  ligne ${i + 1} ${JSON.stringify(Object.values(r)).padEnd(50)} -> date=${JSON.stringify(n.date)} montant=${n.amount} type=${n.type}  ${ok ? "ACCEPTEE" : "QUARANTAINE (" + manque.join(",") + ")"}`);
});

const qualite = rows.length ? Math.round((acceptees.length / rows.length) * 100) : 0;
console.log("\n=== RESULTAT DE L'IMPORT ===");
console.log("  acceptees :", acceptees.length, " quarantaine :", rejetees.length, " qualite :", qualite + " %");

console.log("\n=== VERDICT POINT PAR POINT ===");
let echecs = 0;
const v = (ok: boolean, t: string) => { if (!ok) echecs++; console.log(`  ${ok ? "OK   " : "ECHEC"} ${t}`); };
v(rows.length === 4, "titre + ligne vide au-dessus des en-tetes : 4 lignes lues");
v(entetes.length === 4, "separateur point-virgule trouve malgre le titre : 4 colonnes");
v(entite === "Transaction", "nom trompeur (« ventes » => Order) corrige par les colonnes => Transaction");
v(acceptees.length === 2 && rejetees.length === 2, "2 acceptees / 2 en quarantaine");
v(qualite === 50, "score de qualite = 50 %");
v(acceptees.some((a) => a.date === "2026-03-01" && a.amount === 1500), "montant francais « 1 500,00 $ » lu 1500 au 2026-03-01");
v(acceptees.some((a) => a.amount === 1000 && a.type === "expense"), "nombre stocke en texte (apostrophe) lu 1000, type depense");
v(!acceptees.some((a) => a.amount === 800), "le 31 fevrier n'est pas accepte en douce");
v(!acceptees.some((a) => a.amount === 0), "aucune ligne a 0 $ comptee comme vente");
console.log("\ncas en echec :", echecs);
