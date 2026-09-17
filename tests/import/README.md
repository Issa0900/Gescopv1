# Tests de la chaîne d'import

Ces tests couvrent le trajet complet d'un fichier : **détection du type → mapping
des colonnes → normalisation → validation → agrégation → KPI affiché.**

Ils sont écrits contre les fichiers que les PME produisent réellement : exports
Excel français, séparateurs point-virgule, BOM, titres avant les en-têtes,
colonnes mal nommées, lignes vides, cellules manquantes, montants avec devise.

Ils ne sont jamais chargés par l'application.

## Lancer

Les modules partagés sont écrits pour Deno (`npm:xlsx@0.18.5`). Pour les exécuter
sous Node, on les compile avec esbuild (déjà en `devDependencies`) en
redirigeant cet import. `fichiers-mal-formes.ts` et `point-entree.ts` importent
en plus `base44/shared/client.ts`, qui charge `npm:@base44/sdk` — un module
qui n'a rien à faire dans ces tests, donc on le redirige lui aussi vers un
stub minimal.

Compiler un par un (pas en `Promise.all` : dès qu'un fichier échoue à
compiler, les autres builds encore en vol laissent un `.cjs` obsolète sans
prévenir) :

```bash
mkdir -p tests/import/.build
echo 'module.exports = { createClient: () => ({}) };' > tests/import/.build/sdk-stub.cjs

node -e "
const esbuild=require('esbuild');
const alias={'npm:xlsx@0.18.5':'./node_modules/xlsx','npm:@base44/sdk@0.8.48':'./tests/import/.build/sdk-stub.cjs','@':'./src'};
const noms=['normalisation','chaine','bout-en-bout','fichiers-mal-formes','cas-limites','point-entree'];
(async()=>{ for (const n of noms) {
  await esbuild.build({entryPoints:['tests/import/'+n+'.ts'],bundle:true,
    outfile:'tests/import/.build/'+n+'.cjs',platform:'node',format:'cjs',alias,logLevel:'error'});
  console.log('compile', n);
}})();"

for t in normalisation chaine bout-en-bout fichiers-mal-formes cas-limites; do
  echo "--- $t"; node tests/import/.build/$t.cjs | tail -3
done
```

`tests/import/.build/` est un dossier de travail local (non versionné) — à
supprimer après usage.

Chaque suite se termine par `cas en echec : 0` quand tout va bien.

## Ce que chaque suite vérifie

| Fichier | Couvre |
|---|---|
| `normalisation.ts` | 17 formats de nombres, 12 formats de dates, refus des dates invalides |
| `chaine.ts` | Détection du type, mapping des colonnes françaises, quarantaine |
| `bout-en-bout.ts` | Un fichier de totaux connus jusqu'aux KPI affichés |
| `fichiers-mal-formes.ts` | 12 fichiers réalistes mal formés (BOM, point-virgule, titre, doublons…) |
| `cas-limites.ts` | Fichier vide, colonne manquante, ligne de totaux, apostrophe Excel |
| `kpi.mjs` | Fenêtres calendaires, marge pondérée, autonomie de trésorerie |
| `../recette/DS02-synonymes-revenu.ts` | Synonymes de la colonne revenu (CA, Sales, Revenue, "Chiffre d'affaires"…) sur les entités qui stockent le montant sous des noms différents (`amount` vs `total_revenue`) |

## Défauts que ces tests ont trouvés

Ils ne sont pas théoriques — chacun a été trouvé par ces tests et corrigé :

1. **Le nom du fichier écrasait les colonnes.** Un relevé de transactions nommé
   `ventes.csv` partait en `Order`, où `order_id` est obligatoire : tout le
   fichier en quarantaine. Le nom ne l'emporte désormais que s'il est compatible
   avec les colonnes.
2. **Deux tables d'alias divergentes.** La détection connaissait
   `no_commande → order_id`, l'import non : un fichier de commandes était
   reconnu puis intégralement rejeté.
3. **Un titre avant les en-têtes cassait le CSV**, alors que le même fichier
   passait en `.xlsx`.
4. **Un montant absent devenait 0**, donc une ligne sans montant passait la
   validation et faussait les volumes sans apparaître dans les sommes.
5. **Une date illisible était tronquée à 10 caractères puis stockée** dans un
   champ date (`"Lundi 3 ma"`), contournant la quarantaine.
6. **Le 31 février était accepté** faute de contrôle calendaire.
7. **`1.5M` était lu 1,5** — montant divisé par un million.
8. **`'1000`** (apostrophe Excel « stocker en texte ») était illisible.
9. **`sheetDetect.ts` appelait `XLSX.utils.sheet_to_json` sans jamais importer
   `XLSX`.** `sheetRows()` est la seule fonction qui transforme une feuille lue
   en lignes, et c'est le chemin que `parseDelimitedText` emprunte pour
   *tout* import CSV/TSV : chaque import délimité levait une
   `ReferenceError: XLSX is not defined` avant même d'atteindre le mapping.
10. **CA / Sales / Revenue / "Chiffre d'affaires" faisaient disparaître la
    ligne entière.** `ALIAS_CANONIQUES` résout ces synonymes vers un champ
    générique `revenue`/`net_revenue`/`gross_revenue` qu'aucune entité ne
    possède réellement (Transaction/Expense ont `amount`, Order/Customer/
    ExecutiveSummary ont `total_revenue`) : la valeur était perdue et la ligne
    mise en quarantaine pour champ obligatoire manquant, sur la colonne
    financière la plus centrale d'un relevé.
