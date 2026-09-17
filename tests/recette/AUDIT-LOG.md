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
| 6 | Score de santé (`analyzeBusiness/entry.ts`) : un domaine non mesuré compte-t-il comme bon/mauvais ? Divergence entre les 2 moteurs KPI (frontend `kpiEngine.js` vs backend `core/kpi/`) ? | délégué à un agent en arrière-plan, résultat en attente | — | — | 🔄 en cours |

## À faire (ordre de priorité, cf. plan §1-19 du cahier des charges)

- [ ] 6. Score de santé + cohérence des 2 moteurs KPI (agent en cours, voir ligne 6 ci-dessus)
- [ ] 7. Colonne inconnue / colonne supplémentaire non mappée : ne doit jamais disparaître sans trace
- [ ] 8. Charge : 1000/10000 lignes — temps, pertes, doublons
- [ ] 9. Sécurité RLS / isolation tenant (base44/entities) — lecture de code, pas de test live DB possible dans ce sandbox
- [ ] 10. Autres fonctionnalités de l'app (au-delà de l'import) : pages Dashboard/Kpis/Finance/Tresorerie — cohérence d'affichage, assistant IA §16

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
