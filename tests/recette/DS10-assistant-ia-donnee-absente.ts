// Reconstruction du cas "assistant IA ne doit pas inventer de donnees"
// (sec16 de l'audit) applique a buildBusinessContext, le texte injecte dans
// le prompt de chatAssistant/analyzeBusiness/generateReport. Avant fix, une
// entreprise sans AUCUNE transaction/commande recevait quand meme un
// "Marge nette cumulee: 0 $ (0%)" au premier plan -- une donnee absente
// presentee avec la meme forme qu'une donnee reellement mesuree a zero.
import { buildBusinessContext } from "../../base44/shared/businessContext.ts";

let e = 0;
const t = (b: boolean, msg: string) => { if (!b) e++; console.log(`${b ? "ok  " : "KO  "} ${msg}`); };

function client(overrides: Record<string, any[]> = {}) {
  return {
    entities: new Proxy({}, {
      get: (_t, nom) => ({
        list: async (..._args: any[]) => overrides[String(nom)] || [],
      }),
    }),
  };
}

(async () => {
  console.log("== Entreprise vide (aucune donnee importee) ==");
  const ctxVide = await buildBusinessContext(client());
  t(!/Marge nette cumul.e.*: 0 \$ \(0%\)/.test(ctxVide.context),
    "aucune marge de 0% inventee quand transactions.length === 0");
  t(/non mesurable/i.test(ctxVide.context) && /Total transactions: 0/.test(ctxVide.context),
    "le contexte dit explicitement que la marge n'est pas mesurable");
  t(!/Panier moyen: 0 \$/.test(ctxVide.context),
    "aucun panier moyen de 0$ invente quand orderCount === 0");
  t(/Commandes: 0/.test(ctxVide.context) && /non mesurables/i.test(ctxVide.context),
    "le contexte dit explicitement que le panier moyen n'est pas mesurable");

  console.log("\n== Entreprise avec des transactions reelles (non-regression) ==");
  const transactions = [
    { date: "2026-03-01", amount: 1000, type: "income" },
    { date: "2026-03-02", amount: 400, type: "expense" },
  ];
  const ctxReel = await buildBusinessContext(client({ Transaction: transactions }));
  t(/Marge nette cumul.e.*: 600 \$ \(60%\)/.test(ctxReel.context),
    "une marge reellement mesuree (600$, 60%) s'affiche toujours normalement");
  t(/Total transactions: 2/.test(ctxReel.context), "le compte de transactions reste correct");

  console.log("\ncas en echec :", e);
})();
