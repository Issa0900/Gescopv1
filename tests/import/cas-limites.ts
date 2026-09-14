import { parseDelimitedText } from "../../base44/shared/csvParse.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";
import { missingRequired } from "../../base44/shared/bulkInsert.ts";
const schema = getSchema("Transaction")!;

function essai(libelle: string, texte: string, attenduOk: number) {
  let rows: Record<string, any>[] = []; let err = "";
  try { rows = parseDelimitedText(texte); } catch (e: any) { err = e.message; }
  let ok = 0, q = 0;
  for (const r of rows) {
    const n = normalizeRow("Transaction", r, "i", schema.properties, "csv", []);
    if (missingRequired(n, schema.required).length === 0) ok++; else q++;
  }
  const bon = ok === attenduOk && !err;
  console.log(`${bon ? "ok  " : "KO  "} ${libelle.padEnd(42)} lues:${String(rows.length).padStart(2)} acceptees:${ok}/${attenduOk} quarantaine:${q}${err ? " ERREUR:" + err : ""}`);
  return bon;
}

let e = 0;
const t = (b: boolean) => { if (!b) e++; };
t(essai("fichier vide", "", 0));
t(essai("en-tetes seuls, aucune ligne", "Date,Montant,Type\n", 0));
t(essai("une seule colonne (pas de montant)", "Date\n2026-03-01\n", 0));
t(essai("nombre stocke en texte ('1000)", "Date,Montant,Type\n2026-03-01,'1000,Revenu\n", 1));
t(essai("negatif suffixe (500-)", "Date,Montant,Type\n2026-03-01,500-,Dépense\n", 1));
t(essai("date avec barres obliques 2026/03/01", "Date,Montant,Type\n2026/03/01,500,Revenu\n", 1));
t(essai("guillemets et virgule dans un champ", 'Date,Montant,Description\n2026-03-01,500,"Vente, comptoir"\n', 1));
t(essai("retours chariot Windows", "Date,Montant,Type\r\n2026-03-01,500,Revenu\r\n", 1));
t(essai("espaces partout dans les valeurs", "Date , Montant , Type\n  2026-03-01  ,  500  ,  Revenu  \n", 1));
t(essai("ligne de totaux en fin de fichier", "Date,Montant,Type\n2026-03-01,500,Revenu\nTOTAL,500,\n", 1));
t(essai("colonne montant absente", "Date,Description\n2026-03-01,Vente\n", 0));
console.log("\ncas en echec :", e);
