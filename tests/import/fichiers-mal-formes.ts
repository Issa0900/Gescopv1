// Fichiers tels que les PME les produisent vraiment : exports Excel francais,
// titres avant les en-tetes, colonnes mal nommees, lignes vides, cellules
// manquantes. On mesure combien de lignes SURVIVENT jusqu'aux indicateurs.
import { parseDelimitedText } from "../../base44/shared/csvParse.ts";
import { detectEntityByName } from "../../base44/shared/sheetDetect.ts";
import { detect } from "../../base44/functions/importMultiData/entry.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";

const schema = getSchema("Transaction")!;

function traiter(nomFichier: string, texte: string) {
  let rows: Record<string, any>[] = [];
  let erreur = "";
  try { rows = parseDelimitedText(texte); } catch (e: any) { erreur = e.message; }
  const entetes = rows.length > 0 ? Object.keys(rows[0]) : [];
  const { entity: entite } = detect(nomFichier, entetes, detectEntityByName(nomFichier), null);
  let ok = 0, quarantaine = 0;
  const dates: string[] = []; const montants: number[] = [];
  for (const r of rows) {
    const n = normalizeRow("Transaction", r, "i", schema.properties, "csv", []);
    if (missingRequired(n, schema.required).length === 0) {
      ok++; dates.push(String(n.date)); montants.push(Number(n.amount));
    } else quarantaine++;
  }
  return { rows: rows.length, entetes, entite, ok, quarantaine, erreur, dates, montants };
}

const LIGNES_UTILES = 3; // chaque fichier contient 3 transactions valides
const cas: [string, string, string][] = [
  ["A. CSV standard (virgule)", "ventes.csv",
   "Date,Montant,Type\n2026-03-01,1000,Revenu\n2026-03-02,500,Dépense\n2026-03-03,750,Revenu\n"],

  ["B. CSV point-virgule (Excel FR)", "ventes.csv",
   "Date;Montant;Type\n01/03/2026;1 000,00 $;Revenu\n02/03/2026;500,00 $;Dépense\n03/03/2026;750,00 $;Revenu\n"],

  ["C. BOM + point-virgule", "ventes.csv",
   "﻿Date;Montant;Type\n01/03/2026;1000;Revenu\n02/03/2026;500;Dépense\n03/03/2026;750;Revenu\n"],

  ["D. Titre avant les en-tetes", "ventes.csv",
   "Rapport de ventes - mars 2026\n\nDate,Montant,Type\n2026-03-01,1000,Revenu\n2026-03-02,500,Dépense\n2026-03-03,750,Revenu\n"],

  ["E. En-tetes sales (espaces, casse)", "ventes.csv",
   "  DATE opération  ,  MONTANT  , Type \n2026-03-01,1000,Revenu\n2026-03-02,500,Dépense\n2026-03-03,750,Revenu\n"],

  ["F. Lignes vides intercalees", "ventes.csv",
   "Date,Montant,Type\n2026-03-01,1000,Revenu\n\n2026-03-02,500,Dépense\n\n\n2026-03-03,750,Revenu\n\n"],

  ["G. Cellules manquantes en fin de ligne", "ventes.csv",
   "Date,Montant,Type,Catégorie\n2026-03-01,1000,Revenu,Ventes\n2026-03-02,500,Dépense\n2026-03-03,750,Revenu\n"],

  ["H. Colonne en trop sans en-tete", "ventes.csv",
   "Date,Montant,Type\n2026-03-01,1000,Revenu,note interne\n2026-03-02,500,Dépense,\n2026-03-03,750,Revenu,\n"],

  ["I. Formats de date melanges", "ventes.csv",
   "Date,Montant,Type\n2026-03-01,1000,Revenu\n02/03/2026,500,Dépense\n3 mars 2026,750,Revenu\n"],

  ["J. Montants avec espace insecable", "ventes.csv",
   "Date,Montant,Type\n2026-03-01,\"1 000,00 $\",Revenu\n2026-03-02,\"500,00 $\",Dépense\n2026-03-03,\"750,00 $\",Revenu\n"],

  ["K. En-tetes dupliques", "ventes.csv",
   "Date,Montant,Type,Montant\n2026-03-01,1000,Revenu,1000\n2026-03-02,500,Dépense,500\n2026-03-03,750,Revenu,750\n"],

  // Les combinaisons, pas seulement les defauts isoles : le separateur etait
  // devine sur la premiere ligne du fichier, donc "titre + point-virgule"
  // echouait alors que "titre + virgule" et "point-virgule seul" passaient.
  ["M. Titre + point-virgule (Excel FR)", "ventes.csv",
   "Rapport de ventes - mars 2026\n\nDate opération;Montant;Type\n01/03/2026;1 000,00 $;Revenu\n02/03/2026;500,00 $;Dépense\n03/03/2026;750,00 $;Revenu\n"],

  ["N. Titre + tabulations", "ventes.tsv",
   "Export comptable\n\nDate\tMontant\tType\n2026-03-01\t1000\tRevenu\n2026-03-02\t500\tDépense\n2026-03-03\t750\tRevenu\n"],

  ["O. Titre contenant une virgule + point-virgule", "ventes.csv",
   "Rapport de ventes, mars 2026\n\nDate;Montant;Type\n01/03/2026;1 000,00 $;Revenu\n02/03/2026;500,00 $;Dépense\n03/03/2026;750,00 $;Revenu\n"],

  ["P. Deux lignes de titre + BOM + point-virgule", "ventes.csv",
   "\uFEFFCafé Lumière inc.\nPériode : mars 2026\n\nDate;Montant;Type\n01/03/2026;1000;Revenu\n02/03/2026;500;Dépense\n03/03/2026;750;Revenu\n"],

  ["L. Tabulations", "ventes.tsv",
   "Date\tMontant\tType\n2026-03-01\t1000\tRevenu\n2026-03-02\t500\tDépense\n2026-03-03\t750\tRevenu\n"],
];

// Compter les lignes acceptees ne suffit pas : une ligne peut etre acceptee
// avec une valeur FAUSSE, ce qui est pire qu'un rejet puisque rien ne le
// signale. C'est ainsi qu'une lecture a l'americaine de « 01/03/2026 » (3
// janvier au lieu du 1er mars) a survecu a toute une suite de tests verts.
// Chaque fichier contient donc les memes trois transactions, et on verifie
// les VALEURS obtenues, pas seulement leur nombre.
const DATES_ATTENDUES = ["2026-03-01", "2026-03-02", "2026-03-03"];
const MONTANTS_ATTENDUS = [500, 750, 1000];
const memeListe = (a: any[], b: any[]) => a.length === b.length && a.every((x, i) => x === b[i]);

let echecs = 0;
for (const [libelle, nom, texte] of cas) {
  const r = traiter(nom, texte);
  const bonnesDates = memeListe([...r.dates].sort(), DATES_ATTENDUES);
  const bonsMontants = memeListe([...r.montants].sort((x, y) => x - y), MONTANTS_ATTENDUS);
  const parfait = r.ok === LIGNES_UTILES && bonnesDates && bonsMontants && !r.erreur;
  if (!parfait) echecs++;
  console.log(`${parfait ? "ok  " : "KO  "} ${libelle.padEnd(36)} lues:${String(r.rows).padStart(2)} | acceptees:${r.ok}/${LIGNES_UTILES} | quarantaine:${r.quarantaine} | type:${r.entite}${r.erreur ? " | ERREUR " + r.erreur : ""}`);
  if (!parfait) {
    console.log(`     en-tetes lus : ${JSON.stringify(r.entetes)}`);
    if (!bonnesDates) console.log(`     DATES   obtenues ${JSON.stringify([...r.dates].sort())}  attendues ${JSON.stringify(DATES_ATTENDUES)}`);
    if (!bonsMontants) console.log(`     MONTANTS obtenus ${JSON.stringify([...r.montants].sort((x, y) => x - y))}  attendus ${JSON.stringify(MONTANTS_ATTENDUS)}`);
  }
}
console.log("\nfichiers en echec :", echecs, "/", cas.length);
