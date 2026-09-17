// Reconstruction du cas DS03 (protection contre la perte de donnees / les
// doublons, sec8 de l'audit) : reimporter EXACTEMENT le meme fichier doit
// etre reconnu comme un doublon, pas creer une deuxieme copie de chaque ligne.
import { deduplicateRows } from "../../base44/shared/deduplication.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;
const fichierSource = [
  { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Description": "Vente comptoir" },
  { "Date": "2026-03-02", "Montant": "300", "Type": "Depense", "Description": "Fournitures" },
];

// Un magasin en memoire qui simule Base44 : .list() renvoie ce qui a ete
// persiste par un .bulkCreate() precedent, exactement comme en production.
function magasinEnMemoire() {
  const table: any[] = [];
  return {
    entities: {
      Transaction: {
        list: async (_sort: string, limit: number, offset: number) => table.slice(offset, offset + limit),
        create: async (d: any) => { table.push(d); return d; },
      },
    },
    __table: table,
  };
}

(async () => {
  const base44 = magasinEnMemoire();

  // --- Import n°1 : le fichier est lu et persiste normalement -------------
  const importId1 = "imp-2026-03-01T10:00:00Z";
  const lignes1 = fichierSource.map((r) => normalizeRow("Transaction", r, importId1, schema.properties, "csv", []));
  const res1 = await deduplicateRows(base44, "Transaction", lignes1);
  t(res1.newCount === 2 && res1.duplicateCount === 0,
    `import 1 (premiere fois) : ${res1.newCount} nouvelles, ${res1.duplicateCount} doublons (attendu 2 nouvelles, 0 doublon)`);
  for (const r of res1.newRows) await base44.entities.Transaction.create(r);

  // --- Import n°2 : le MEME fichier est reimporte (ex. double-clic, retry,
  // cron qui repasse sur le meme mois). Seul son import_id differe, parce que
  // c'est un nouveau lot d'import — le contenu metier est identique. --------
  const importId2 = "imp-2026-03-01T10:05:12Z"; // meme fichier, quelques secondes plus tard
  const lignes2 = fichierSource.map((r) => normalizeRow("Transaction", r, importId2, schema.properties, "csv", []));
  const res2 = await deduplicateRows(base44, "Transaction", lignes2);
  t(res2.newCount === 0 && res2.duplicateCount === 2,
    `import 2 (reimport identique) : ${res2.newCount} nouvelles, ${res2.duplicateCount} doublons (attendu 0 nouvelle, 2 doublons)`);
  for (const r of res2.newRows) await base44.entities.Transaction.create(r);
  t(base44.__table.length === 2,
    `table apres reimport : ${base44.__table.length} lignes en base (attendu 2, pas 4)`);

  // --- Non-regression : deux lignes VRAIMENT differentes du meme import ---
  // ne doivent pas etre fusionnees entre elles.
  const importId3 = "imp-2026-03-05T09:00:00Z";
  const lignesDiff = [
    normalizeRow("Transaction", { "Date": "2026-03-05", "Montant": "100", "Type": "Revenu" }, importId3, schema.properties, "csv", []),
    normalizeRow("Transaction", { "Date": "2026-03-05", "Montant": "200", "Type": "Revenu" }, importId3, schema.properties, "csv", []),
  ];
  const res3 = await deduplicateRows(base44, "Transaction", lignesDiff);
  t(res3.newCount === 2 && res3.duplicateCount === 0,
    `deux lignes reellement differentes (memes date/type, montant different) : ${res3.newCount} nouvelles, ${res3.duplicateCount} doublons (attendu 2, 0)`);

  console.log("\ncas en echec :", e);
})();
