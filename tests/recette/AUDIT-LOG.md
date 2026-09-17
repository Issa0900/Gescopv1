# Journal d'audit GESCOP — mémoire de session à session

Ne pas retester ce qui est déjà marqué ✅ ci-dessous sans raison nouvelle
(régression suspectée, code modifié depuis). Ce fichier est la source de
vérité sur ce qui a déjà été vérifié contre le moteur réel — pas dans une
conversation qui peut être résumée/perdue.

Convention : chaque ligne = un cas de test réel, exécuté contre le vrai code
(pas un mock qui approuve tout), avec le fichier de test qui le prouve.

## Fait

| # | Cas | Fichier de preuve | Résultat avant | Résultat après | Statut |
|---|---|---|---|---|---|
| 1 | `sheetDetect.ts` : `XLSX` utilisé sans import → tout import CSV/TSV plante | `tests/import/cas-limites.ts` (suite préexistante) | 11/11 échecs | 0/11 | ✅ corrigé |
| 2 | Synonymes CA/Sales/Revenue/"Chiffre d'affaires" perdus (Transaction: pas de champ `amount`; Customer/Order: pas de champ `revenue`) | `tests/recette/DS02-synonymes-revenu.ts` | 8+4 échecs | 0/12 | ✅ corrigé |
| 3 | Réimport du même fichier = doublon jamais détecté (`fingerprint.ts` incluait `import_id`, propre à chaque import, dans le hash) | `tests/recette/DS03-idempotence-reimport.ts` | 2/4 échecs | 0/4 | ✅ corrigé |
| 4 | NULL vs zéro sur `amount` (Transaction) : vide/N/A/tiret → doit rester non mesuré, `0` réel doit rester `0` | `tests/recette/DS04-null-vs-zero.ts` | déjà correct (7/7) | 7/7 | ✅ pas de bug — confirmé, pas retesté sans raison |
| 5a | `currency` toujours forcé à `"CAD"` en dur, ignorant une colonne Devise/Currency explicite | `tests/recette/DS05-devises-et-dates.ts` | 2/8 échecs | 8/8 | ✅ corrigé |
| 5b | `parseDate` ne reconnaissait pas l'ordinal français ("1er janvier 2026") | `tests/recette/DS05-devises-et-dates.ts` | inclus ci-dessus | inclus ci-dessus | ✅ corrigé |
| 6 | `kpiRegistry.js` (moteur KPI réellement utilisé par Dashboard/Finance/Tresorerie) : COGS/CAC/AOV non mesurés traités comme `0` → marge brute à 100% inventée, CAC "gratuit" inventé, au lieu de "non mesurable" | `tests/recette/DS06-kpi-donnee-absente.ts` (diagnostic initial par agent délégué, transformé en test de régression) | 6 divergences vs le moteur backend `kpiCatalog.ts` | 0/8 échecs | ✅ corrigé (gross_margin, cac, roas, marketing_roi, aov) |

## Trouvé mais PAS corrigé (décision humaine ou chantier plus large requis)

- **Score de santé LLM (`base44/functions/analyzeBusiness/entry.ts`)** : le score global et les 9 scores de dimension sont générés par un appel LLM (`InvokeLLM`, gemini_3_1_pro) dont le JSON schema force `score: number` sans champ `measured`/nullable — un domaine sans données reçoit quand même un score 0-100 inventé, stocké dans `Company.health_score` et affiché tel quel par `src/pages/Historique.jsx`. `src/pages/Dashboard.jsx`, lui, utilise un moteur déterministe séparé (`src/lib/domainScores.js`) qui gère déjà correctement un flag `measured` — donc **deux mécanismes de score coexistent**, un correct et un défaillant. Correctif proposé (non appliqué, nécessite de valider le comportement du LLM en conditions réelles) : ajouter `measured: boolean` au schema JSON imposé au LLM, l'instruire explicitement dans le prompt, et calculer `health_score` côté serveur (moyenne des dimensions `measured=true` uniquement) plutôt que de le laisser inventer.
- **`base44/shared/core/kpi/` (kpiCatalog.ts/metricEngine.ts) est du code mort en production** malgré une logique correcte : rien dans `base44/functions/` ni aucune page n'appelle `.calculate()` de ce module (seul `KpiManagementPanel.jsx` en lit les métadonnées). À clarifier avec le porteur du projet : le supprimer (dette), ou le brancher réellement en remplacement du calcul LLM ?
- **Affichage UI du "non mesurable"** : les composants consomment déjà `kpi?.value || 0`, donc le `null` ne crashe rien, mais rien n'affiche encore "non mesurable" à la place de `0` dans Dashboard/Finance/Kpis — c'est un chantier UI, pas un bug de calcul.

| 7 | Colonne inconnue/supplémentaire : disparaissait sans trace visible (seule `original_data`, jamais lue par l'UI, la gardait) | `tests/recette/DS07-colonne-inconnue.ts` | aucune remontée | 5/5, message explicite ajouté au résultat d'import | ✅ corrigé |
| 8 | Charge 1000/10000 lignes a révélé : `parseNumber("abc")` / tout texte purement alphabétique → `0` au lieu de rejeté (`Number("")===0` en JS après avoir tout retiré) | `tests/recette/DS08-charge-volume.ts` | 4/8 échecs (0 ligne rejetée au lieu de 1/7) | 8/8, ~50-100k lignes/s | ✅ corrigé |
| 9 | Doublons **à l'intérieur du même fichier** (pas juste entre deux imports) | `tests/recette/DS09-doublons-intra-fichier.ts` | déjà correct (2/2) | 2/2 | ✅ pas de bug — déjà couvert par le fix de l'item 3 |
| 10 | Sécurité RLS : les 32 entités (`base44/entities/*.jsonc`) ont-elles toutes `rls.read/update/delete` scopé à `created_by_id: {{user.id}}` ? | lecture de code, script bash de vérification (pas de DB live possible dans ce sandbox) | — | 31/32 conformes ; `User.jsonc` seul sans bloc `rls` explicite | ⚠️ PASS avec réserve — voir notes |

## Trouvé, non branché en production (ne pas confondre avec une protection active)

- **`base44/functions/semanticIngest/entry.ts` simule une sauvegarde.** `savedCount += batch.length` sans jamais appeler `base44.entities.Observation.bulkCreate` (commenté dans le code, "Pour l'instant on simule le success") — la fonction renvoie `status: "success"` et un compte de lignes "sauvegardées" qui n'ont jamais été écrites. Vérifié : rien dans `base44/` ni `src/` n'appelle cette fonction — code mort, pas un bug actif. Si un jour elle est branchée à une route, il faudra retirer la simulation avant.
- **`User.jsonc` n'a pas de bloc `rls` explicite**, contrairement aux 31 autres entités. À confirmer avec le porteur du projet : Base44 gère peut-être nativement l'isolation de l'entité `User` intégrée (chaque utilisateur ne voit que son propre profil par défaut) sans qu'un bloc RLS explicite soit nécessaire — je n'ai pas de moyen de le vérifier sans accès à la plateforme Base44 elle-même. Ne pas ajouter de bloc RLS ici sans confirmer le comportement par défaut, au risque de casser l'auth.

## Trouvé, limite de l'environnement de test (pas un verdict sur le bug)

- **Impossible de tester les pages Dashboard/Kpis/Finance/Tresorerie avec de vraies données dans ce sandbox.** `base44 dev` (backend local) exige `base44 login` + `base44 link`, indisponibles ici. `npm run build` + `vite preview` démarrent bien (0 erreur de compilation) et `/` et `/login` ne crashent pas (0 erreur React, aucun NaN/undefined/Infinity visible), mais toutes les routes derrière l'authentification restent inaccessibles sans un backend Base44 réel — donc pas de vérification possible de la cohérence d'affichage des KPI en conditions réelles depuis cette session. Reste à faire par quelqu'un avec un accès `base44 dev` ou des identifiants de test.
- **`point-entree.ts` teste un contrat qui n'existe plus.** Le test attend que `entry.ts` lise un client injecté via `globalThis.__BASE44_STUB`, mais `entry.ts` appelle toujours `createFixedClientFromRequest(req)` (ligne 320) qui construit un vrai client SDK depuis les en-têtes de la requête — sans lire ce stub. Ce n'est pas un bug de production (les vrais appels ont toujours l'en-tête `Base44-App-Id`, fourni par la plateforme), c'est de la dette de test : `entry.ts` n'est plus testable en isolation. Volontairement PAS corrigé : ajouter un contournement dans `client.ts` (frontière d'authentification) juste pour qu'un test passe serait exactement le genre de raccourci que l'audit interdit (§19 "ne désactive pas une validation simplement parce qu'elle bloque"). Nécessite une décision de conception (ex: injection de dépendance explicite du client dans le handler) plutôt qu'un correctif local.

## Trouvé, nécessite une décision produit (pas de fix appliqué)

- **`Finance.jsx` et `Marketing.jsx` ne passent pas par `kpiRegistry.js`** pour marge/ROAS — ils recalculent leurs propres formules inline (`Finance.jsx:42`, `Marketing.jsx:68,113,135,234`). Ça n'a pas causé de bug observable (les deux ont déjà leurs propres gardes `|| 0` / `> 0 ? ... : "-"`), mais ça viole directement le principe "une métrique = une formule, un seul moteur" du §9. Perimètre trop large pour un correctif ponctuel sans tests UI en conditions réelles (cf. point ci-dessus) — à traiter comme un chantier dédié.

| 11 | Assistant IA (`chatAssistant` → `businessContext.ts`) : entreprise sans transaction/commande recevait quand même "Marge nette cumulée: 0 $ (0%)" / "Panier moyen: 0 $" en tête de contexte — donnée absente présentée sous la même forme qu'une donnée mesurée à zéro | `tests/recette/DS10-assistant-ia-donnee-absente.ts` | 4/6 échecs | 6/6 | ✅ corrigé (financeSection + salesSection) |

| 12 | `generateReport` : comparaison de périodes — un mois sans aucune transaction importée, comparé à un mois précédent réel, affichait "Marge %: -100%" (effondrement inventé) au lieu de "non mesurable" | `tests/recette/DS11-rapport-periode-vide.ts` | confirmé : -100% calculé | 5/5, "non-mesurable" explicite | ✅ corrigé |

| 13 | `notifyCriticalEvent` était la seule fonction (9 autres OK) à ne jamais appeler `auth.me()` — combinée à `asServiceRole`, n'importe quel appelant non authentifié pouvait faire envoyer un vrai email et créer une Alerte pour un `user_id` arbitraire pris dans le corps de la requête | Vérifié par lecture de code + comparaison systématique des 10 fonctions (`grep auth.me()`) | 1/10 fonctions sans garde | 10/10 avec garde | ✅ corrigé — **pas de test automatisé** : même mur que `point-entree.ts`, `auth.me()` du SDK réel fait toujours un vrai appel réseau (`axios.get`), aucun moyen de le simuler sans backend Base44 vivant |
| 14 | `inspectSheet` (backfill de champs vides) : ne modifie jamais un champ déjà rempli, pagine correctement | Lecture de code | — | — | ✅ déjà correct, aucune modification |
| 15 | `scanExternalRadar` : `deleteMany({})` effaçait TOUS les signaux existants avant recréation, même quand le scan ne trouvait aucun signal exploitable (URL invalide, score < 50) — le code protégeait déjà ce cas pour un échec de parsing LLM ("vos données sont conservées") mais pas pour un parsing réussi filtré à zéro | `tests/recette/DS13-radar-scan-vide.ts` (`filterSignals` extrait en fonction pure testable) | 0 protection pour ce cas précis | 5/5, `deleteMany` sauté si 0 signal retenu | ✅ corrigé |
| 16 | `enrichFromWebsite` : auth présente, prompt interdit déjà d'inventer ("Ne devine pas") | Lecture de code | — | — | ✅ déjà correct, aucune modification |

## Trouvé, nécessite une décision produit (pas de fix appliqué) — suite

- **`notifyCriticalEvent` accepte `user_id` sans vérifier que l'appelant a le droit de notifier CET utilisateur précis.** Le correctif appliqué (item 13) bloque les appels totalement non authentifiés, mais un utilisateur authentifié A pourrait toujours théoriquement déclencher une notification pour un `user_id` B différent du sien — je n'ai pas ajouté de vérification `user_id === caller.id` car je ne sais pas si cette fonction est censée être déclenchée uniquement par l'utilisateur concerné (auto-notification) ou par un processus interne (détection d'anomalie automatique) qui notifierait légitimement un autre utilisateur. Aucun appelant n'existe dans le code actuel (fonction non branchée) — à trancher si/quand elle est câblée à un déclencheur réel.

| 17 | `analyzeBusiness` hors score LLM : wipe des Anomaly/Risk/Opportunity/Kpi seulement APRÈS validation d'un diagnostic exploitable (`dimensions.length === 0` bloque avant toute suppression) | Lecture de code | — | — | ✅ déjà correct, aucune modification — même principe que le fix de `scanExternalRadar`, déjà bien appliqué ici |

| 18 | Score de santé LLM : un domaine non mesuré recevait quand même un score 0-100 inventé, moyenné dans le score global | `tests/recette/DS14-score-sante-non-mesure.ts` | pas de champ `measured`, moyenne calculée par le LLM lui-même | 5/5 | ✅ corrigé (décision utilisateur du 2026-09-17 : approuvé) — `computeHealthScore` calcule la moyenne côté serveur sur les dimensions `measured` uniquement ; `Company.health_score`/`AnalysisRun.health_score`/la réponse HTTP utilisent tous la même valeur ; `Historique.jsx` et `Dashboard.jsx` affichent "N/A" au lieu d'un badge rouge "0" quand `health_score` est `null` |

| 20 | `Finance.jsx` unifié sur `kpiRegistry.js` — a révélé un bug d'architecture plus profond : le moteur marquait un KPI entier "indisponible" dès qu'UNE dépendance candidate manquait, même avec des alternatives (`deps.a \|\| deps.b`) disponibles. `total_revenue`/`total_expense` étaient donc TOUJOURS indisponibles sur des Transaction seules (Résultat Net toujours à 0$) | `tests/recette/DS15-kpi-engine-context.ts` | 0 → sonde manuelle confirmée cassée | 10/10 | ✅ corrigé (statut UNAVAILABLE seulement si TOUTES les dépendances échouent ; `_aggregateRawField` sépare désormais revenus/dépenses par ligne au lieu d'un seul champ résolu pour tout le lot) |

## Trouvé, nécessite une décision produit (pas de fix appliqué) — suite 2

- **`Marketing.jsx` n'est PAS unifié sur `kpiRegistry.js`.** Sa logique locale (ROAS/CAC global + par canal + par campagne, avec repli explicite transactions→campagnes et libellés "non mesurable" déjà corrects) est correcte et déjà bien conçue — aucun bug trouvé en la relisant. `useKpiEngine.js` ne supporte même pas encore les entités Campaign/CampaignDaily (seulement transactions/cashflow/orders/expenses/employees/payrolls/customers/products/observations) : unifier vraiment nécessiterait d'abord ajouter cette entité à `entityFieldMap.js` et `useKpiEngine.js`, un chantier séparé et plus risqué que ce que demandait la correction. Laissé tel quel plutôt que forcer un changement qui casserait potentiellement une page qui fonctionne.
- **Statut `AVAILABLE` imprécis pour un KPI composite dérivé d'un autre KPI déjà calculé dans le même batch** (ex: `net_income` affiche status `AVAILABLE` même quand `total_expense` était `UNAVAILABLE`) : `computeKpiBatch` ne propage que la VALEUR d'un KPI déjà calculé au KPI suivant, pas son statut. La VALEUR reste correcte (`null` quand approprié, vérifié par tests), seul le champ `status` de la lineage est optimiste. Rien dans l'UI actuelle ne lit ce `status` pour décider quoi que ce soit (seule `value` est consommée) — documenté, pas corrigé, risque de changer ce comportement plus large que nécessaire.

## Fusion avec `main` (2026-09-17) — PR #2, 7 conflits + 3 bugs révélés par la régression complète

`main` avait avancé en parallèle sur une architecture d'import beaucoup plus
large (registre de concepts `registry/conceptRegistry.ts`, plan de lecture
IA+preuves `importPlan.ts`, moteur sémantique `dataProfiler.ts`/
`semanticMatcher.ts`/`observationEngine.ts`, etc.) — 116 fichiers touchés au
total par la fusion. Les 7 conflits ont été résolus en vérifiant factuellement
chaque côté (pas de résolution "à l'aveugle") ; le détail des raisons est dans
le message du commit de fusion (`9e91d8e`). Le point notable : plusieurs
dépendances de KPI ajoutées par `main` (`cpc`, `cpm`, et les remplacements de
`gross_margin_amount`/`cac`/`roas`/`marketing_roi`) référençaient des clés
canoniques qui n'existent pas dans `entityFieldMap.js` (`cost`,
`purchase_cost`, `budget`, `active_customers`) — vérifié par grep direct, pas
supposé. Gardé mes versions vérifiées, corrigé les deux KPI en plus.

| 19 | `importPlan.ts` `appliquerPlan()` : une colonne jugée par l'IA sans correspondance (`champ: null`) était quand même réintroduite sous son en-tête d'origine — la variable censée faire la distinction (`rattacherParSynonymes`, plan par règles vs plan IA) était calculée mais jamais utilisée | `tests/import/plan-lecture.ts` (préexistant sur `main`, jamais passé avant la fusion faute de CI) | 1/17 échec | 17/17 | ✅ corrigé |
| 20 | `importMultiData/entry.ts` `lignesSelonPlan()` : le filet de sécurité "ligne d'en-têtes décalée d'un cran" ne se déclenchait que sur 0 ligne produite, mais un décalage peut produire 1-2 lignes bien formées mais absurdes (de vraies données réinterprétées comme en-têtes) — le filet ne se déclenchait alors jamais | `tests/import/point-entree.ts` (préexistant, jamais passé — voir item 21) | filet inopérant dans ce cas précis | corrigé : se déclenche aussi quand aucune colonne déclarée par le plan ne correspond à la vraie ligne d'en-têtes | ✅ corrigé |
| 21 | `importPlan.ts` `planParRegles()` : `ReferenceError: cleanC is not defined` — `cleanC`/`noAccentC` déclarées avec `const` dans un bloc `if (schema) { ... }` puis référencées dans un bloc suivant hors de portée | Révélé par le fix de l'item 20 (chemin de repli jamais réellement exercé avant, donc jamais atteint) | crash silencieusement absorbé par le try/catch de l'appelant (0 ligne, aucun message) | plus de crash | ✅ corrigé — présent depuis le clone initial du projet, jamais détecté faute de CI |
| 22 | `tests/import/point-entree.ts` ne pouvait jamais s'exécuter : le test pose un client Base44 factice sur `globalThis.__BASE44_STUB`, mais `client.ts` `createFixedClientFromRequest()` ne lisait jamais cette variable — appelait toujours le vrai SDK, qui exige les en-têtes HTTP réels (`Base44-App-Id`, etc.) absents en test | — | crash `TypeError` dès la première requête | 9/9 (toutes les suites de `tests/import/` passent, y compris celle-ci pour la première fois) | ✅ corrigé — seam de test ajouté, aucun code de production existant ne lit ce global (jamais actif hors des tests) |

Régression complète après fusion + ces 4 corrections : **9/9 suites `tests/import/` + 13/13 `tests/recette/DS*`, 0 échec**. `npm run build` propre. PR #2 fusionnée dans `main` (commit `63a549e`).

## À faire

- [ ] 21. Tableau de bilan final (§18 du cahier des charges) à régénérer avec les items 17-22 — `tests/recette/BILAN-FINAL.md` date d'avant ces corrections
- [ ] 22. Pages UI réelles (Dashboard, Kpis, Finance, Tresorerie) — en attente que l'utilisateur soit sur son ordinateur pour tester avec de vraies données
- [ ] 23. Publier depuis le tableau de bord Base44 pour que l'app déployée reflète `main` (je n'ai pas accès au dashboard)

## Notes d'architecture à ne pas redécouvrir

- `src/lib/core/duplicateDetector.js` est du code mort — rien dans `base44/`
  ni `src/` ne l'importe. Le vrai pipeline (`importMultiData/entry.ts`)
  n'utilise que `base44/shared/deduplication.ts`.
- Deux moteurs KPI coexistent : frontend `src/lib/core/kpiEngine.js` /
  `kpiRegistry.js` et backend `base44/shared/core/kpi/`. Vérifier lequel fait
  autorité avant de corriger une formule des deux côtés.
- Harnais de test : voir `tests/import/README.md` pour la commande esbuild
  exacte (stub `npm:@base44/sdk` requis pour `fichiers-mal-formes.ts` et
  `point-entree.ts`).
- `point-entree.ts` échoue actuellement sur `Base44-App-Id header is
  required` — problème de bootstrap du client SDK, pas du moteur de données.
  Pas encore investigué.
