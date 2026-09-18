// Le point d'entree importMultiData, avec un client Base44 simule.
//
// Ce qu'on verifie ici n'est pas le modele mais le CONTRAT : en mode analyse
// rien ne doit etre ecrit, et en mode import c'est le plan valide par
// l'utilisateur qui doit piloter la lecture — pas une nouvelle analyse.
import handler from "../../base44/functions/importMultiData/entry.ts";

let echecs = 0;
const v = (ok: boolean, t: string) => { if (!ok) echecs++; console.log(`  ${ok ? "OK   " : "ECHEC"} ${t}`); };

const FICHIER_TEXTE =
  "Boulangerie Saint-Roch inc.\n" +
  "Grand livre - mars 2026\n" +
  "\n" +
  "Date ope.;Libelle;Sens;Mtt HT reel\n" +
  "25/03/26;Vente comptoir;C;1 250,50\n" +
  "02/03/26;Facture Sysco;D;864,30\n" +
  "TOTAUX;;;2 114,80\n";

const REPONSE_IA = {
  entite: "Transaction",
  ligne_entetes: 2,
  lignes_ignorees: [5],
  colonnes: [
    { colonne: "Date ope.", champ: "date", convention_date: "JJ/MM" },
    { colonne: "Libelle", champ: "description" },
    { colonne: "Sens", champ: "type", valeurs: { C: "income", D: "expense" } },
    { colonne: "Mtt HT reel", champ: "amount" },
  ],
  confiance: "haute",
  explication: "J'ai lu 2 transactions du grand livre de mars 2026.",
};

// --- Le double du client Base44 -------------------------------------------
function faireClient(options: { memoire?: any[]; appelsIA: string[]; ecritures: any[] }) {
  const { memoire = [], appelsIA, ecritures } = options;
  const entite = (nom: string) => ({
    filter: async (q: any) => (nom === "Import" ? memoire.filter((m) => m.plan_signature === q.plan_signature && m.plan_confirmed === q.plan_confirmed) : []),
    create: async (d: any) => { ecritures.push({ entite: nom, action: "create", data: d }); return { id: "imp-1", ...d }; },
    update: async (id: string, d: any) => { ecritures.push({ entite: nom, action: "update", id, data: d }); return d; },
    bulkCreate: async (rows: any[]) => { ecritures.push({ entite: nom, action: "bulkCreate", nb: rows.length, rows }); return rows; },
  });
  return {
    entities: new Proxy({}, { get: (_t, nom) => entite(String(nom)) }),
    auth: { me: async () => ({ id: "u1" }) },
    asServiceRole: {
      integrations: { Core: { InvokeLLM: async (args: any) => { appelsIA.push(args.prompt); return REPONSE_IA; } } },
    },
  };
}

(globalThis as any).fetch = async () => ({
  text: async () => FICHIER_TEXTE,
  arrayBuffer: async () => new ArrayBuffer(0),
});

function poser(client: any) { (globalThis as any).__BASE44_STUB = client; }
const requete = (corps: any) => new Request("https://x/import", { method: "POST", body: JSON.stringify(corps) });
const URL_FICHIER = "https://storage.exemple.test/grand-livre.csv";

(async () => {
  console.log("===== 1. Mode analyse : on lit, on n'ecrit rien =====");
  let appelsIA: string[] = []; let ecritures: any[] = [];
  poser(faireClient({ appelsIA, ecritures }));
  let rep = await handler(requete({ files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }], mode: "analyser" }));
  let data = await rep.json();
  const a = data.results[0];
  console.log("      plan :", JSON.stringify({ entite: a.plan?.entite, ligne_entetes: a.plan?.ligne_entetes, ignorees: a.plan?.lignes_ignorees }));
  console.log("      apercu :", JSON.stringify(a.apercu));
  v(ecritures.length === 0, "AUCUNE ecriture en base pendant l'analyse");
  v(appelsIA.length === 1, "l'IA est appelee une seule fois pour la feuille");
  v(a.status === "analyse" && a.plan?.entite === "Transaction", "un plan est rendu");
  v(a.plan?.ligne_entetes === 2, "l'en-tete de rapport est ecarte (2 lignes, la ligne vide ne compte pas)");
  v(a.apercu?.length === 2, "apercu : 2 lignes (la ligne TOTAUX est ecartee)");
  v(a.apercu?.[0]?.date === "2026-03-25", "apercu : 25/03 lu le 25 mars");
  v(a.apercu?.[0]?.type === "income" && a.apercu?.[1]?.type === "expense", "apercu : codes C/D traduits");
  v(typeof a.signature === "string" && a.signature.length > 0, "une empreinte de fichier est calculee");
  v(typeof a.plan?.explication === "string" && a.plan.explication.length > 0, "une explication en francais accompagne le plan");

  console.log("\n===== 2. Mode import avec le plan valide : l'IA n'est PAS rappelee =====");
  appelsIA = []; ecritures = [];
  poser(faireClient({ appelsIA, ecritures }));
  rep = await handler(requete({
    files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }],
    plans: { "grand-livre.csv": a.plan },
  }));
  data = await rep.json();
  const creation = ecritures.find((e) => e.entite === "Import" && e.action === "create");
  v(appelsIA.length === 0, "aucun appel a l'IA : le plan valide fait autorite");
  v(!!creation, "un enregistrement d'import est cree");
  v(creation?.data?.plan_confirmed === true, "le plan est marque comme confirme par un humain");
  v(typeof creation?.data?.plan_signature === "string", "l'empreinte est enregistree avec l'import");
  v(!!creation?.data?.read_plan, "le plan est enregistre, donc rejouable le mois prochain");

  console.log("\n===== 3. Memoire : un plan deja confirme evite un nouvel appel =====");
  appelsIA = []; ecritures = [];
  poser(faireClient({
    appelsIA, ecritures,
    memoire: [{ plan_signature: a.signature, plan_confirmed: true, read_plan: a.plan }],
  }));
  rep = await handler(requete({ files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }], mode: "analyser" }));
  data = await rep.json();
  v(appelsIA.length === 0, "empreinte reconnue : l'IA n'est pas rappelee");
  v(data.results[0].plan?.origine === "memoire", "le plan vient de la memoire");
  v(ecritures.length === 0, "toujours aucune ecriture en mode analyse");

  console.log("\n===== 4. L'IA tombe en panne : l'import reste possible =====");
  appelsIA = []; ecritures = [];
  const clientCasse: any = faireClient({ appelsIA, ecritures });
  clientCasse.asServiceRole.integrations.Core.InvokeLLM = async () => { throw new Error("503"); };
  poser(clientCasse);
  rep = await handler(requete({ files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }], mode: "analyser" }));
  data = await rep.json();
  v(data.results[0].plan?.origine === "regles", "repli sur les regles deterministes");
  v(String(data.results[0].analyse_erreur || "").includes("indisponible"), "la panne est dite, pas masquee");

  console.log("\n===== 5. Plan decale d'un cran : repli annonce, pas d'echec muet =====");
  appelsIA = []; ecritures = [];
  const clientDecale: any = faireClient({ appelsIA, ecritures });
  // L'IA se trompe d'une ligne : plus aucun intitule ne correspond.
  clientDecale.asServiceRole.integrations.Core.InvokeLLM = async () => ({ ...REPONSE_IA, ligne_entetes: 3 });
  poser(clientDecale);
  rep = await handler(requete({ files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }], mode: "analyser" }));
  data = await rep.json();
  v(data.results[0].apercu?.length > 0, "l'apercu n'est pas vide : le filet a joue");

  appelsIA = []; ecritures = [];
  poser(clientDecale);
  rep = await handler(requete({ files: [{ file_url: URL_FICHIER, file_name: "grand-livre.csv" }] }));
  data = await rep.json();
  console.log("      resultat :", JSON.stringify({
    rows_read: data.results[0].rows_read, rows: data.results[0].rows,
    quarantined: data.results[0].quarantined, message: data.results[0].message,
  }));
  // Les regles ne savent pas lire « Sens » ni « Mtt HT reel » — c'est
  // exactement pourquoi l'IA existe. Ce qu'on exige du filet n'est donc pas de
  // sauver l'import, mais de ne jamais laisser l'utilisateur devant un echec
  // inexplique : les lignes sont lues, et le resultat dit ce qui s'est passe.
  v(data.results[0].rows_read > 0, "les lignes du fichier sont bien lues");
  v(String(data.results[0].message || "").includes("lecture automatique"),
    "le repli est annonce dans le resultat");
  v(/champs obligatoires absents|valeur non reconnue/.test(String(data.results[0].message || "")),
    "et la raison des rejets est nommee, colonne par colonne");

  console.log("\ncas en echec :", echecs);
})();
