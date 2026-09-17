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

## À faire (ordre de priorité, cf. plan §1-19 du cahier des charges)

- [ ] 11. Autres fonctionnalités de l'app (au-delà de l'import/KPI) : pages Dashboard/Kpis/Finance/Tresorerie — cohérence d'affichage, assistant IA §16
- [ ] 12. Score de santé LLM (voir "Trouvé mais PAS corrigé" plus haut) — nécessite une décision produit avant de toucher au prompt/schema
- [ ] 13. `point-entree.ts` : bootstrap SDK (`Base44-App-Id header is required`) jamais creusé

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
