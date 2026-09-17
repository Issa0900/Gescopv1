// Cas non couvert par DS03 (qui teste la reimportation d'un fichier) :
// deux lignes STRICTEMENT identiques a l'interieur du MEME fichier, comme
// un export comptable avec une ligne dupliquee par erreur ou un copier-
// coller malheureux (sec3/sec8 de l'audit).
import { deduplicateRows } from "../../base44/shared/deduplication.ts";
import { normalizeRow } from "../../base44/shared/importUtils.ts";
import { getSchema } from "../../base44/shared/entitySchemas.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

const schema = getSchema("Transaction")!;

function magasinVide() {
  const table: any[] = [];
  return { entities: { Transaction: {
    list: async (_s: string, limit: number, offset: number) => table.slice(offset, offset + limit),
    create: async (d: any) => { table.push(d); return d; },
  } }, __table: table };
}

(async () => {
  const base44 = magasinVide();
  const importId = "imp-unique";
  const fichier = [
    { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Description": "Vente" },
    { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Description": "Vente" }, // copie exacte
    { "Date": "2026-03-01", "Montant": "500", "Type": "Revenu", "Description": "Vente" }, // triple
    { "Date": "2026-03-02", "Montant": "300", "Type": "Depense", "Description": "Fournitures" },
  ];
  const lignes = fichier.map((r) => normalizeRow("Transaction", r, importId, schema.properties, "csv", []));
  const res = await deduplicateRows(base44, "Transaction", lignes);
  t(res.newCount === 2 && res.duplicateCount === 2,
    `4 lignes dont 3 identiques -> ${res.newCount} nouvelles, ${res.duplicateCount} doublons (attendu 2 nouvelles [1 exemplaire de la vente + la depense], 2 doublons)`);
  for (const r of res.newRows) await base44.entities.Transaction.create(r);
  t(base44.__table.length === 2, `table finale : ${base44.__table.length} lignes (attendu 2, pas 4)`);

  console.log("\ncas en echec :", e);
})();
