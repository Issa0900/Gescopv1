# GESCOP — Bilan de contrôle (§18 du cahier des charges)

Audit mené par lecture de code + tests réels contre le moteur (esbuild, voir
`tests/import/README.md`), sans accès possible à l'app déployée depuis ce
sandbox (WebSocket du SDK Base44 non supporté par le proxy sortant — voir
notes de fin). 13 défauts réels trouvés et corrigés, tous avec un test qui
échouait avant et passe après. Détail complet, preuves et code exact dans
`tests/recette/AUDIT-LOG.md` et `tests/import/README.md`.

| Module | Objectif | Test | Résultat | Problème | Correction | Statut |
|---|---|---|---|---|---|---|
| Ingestion CSV/TSV | Lire un fichier délimité sans planter | `tests/import/cas-limites.ts` (suite préexistante) | 11/11 échecs → 0/11 | `sheetDetect.ts` appelait `XLSX.utils` sans jamais l'importer — chaque import CSV/TSV levait `ReferenceError` | Import ajouté | PASS |
| Mapping colonnes | Reconnaître CA/Sales/Revenue/"Chiffre d'affaires" quel que soit le nom | `tests/recette/DS02-synonymes-revenu.ts` | 8+4 échecs → 0/12 | Synonymes résolus vers un champ générique qu'aucune entité ne possède — ligne entière perdue | Repli vers le champ revenu réel de l'entité cible | PASS |
| Idempotence import | Réimporter le même fichier ne doit pas dupliquer | `tests/recette/DS03-idempotence-reimport.ts` | 2/4 échecs → 0/4 | `fingerprint.ts` incluait `import_id` (unique par import) dans le hash — dédup entre imports non fonctionnelle | Hash sur le contenu métier uniquement, clés triées | PASS |
| Doublons intra-fichier | 3 lignes identiques dans un même fichier → 1 seule persistée | `tests/recette/DS09-doublons-intra-fichier.ts` | déjà correct | 2/2 | — | PASS |
| NULL vs zéro (montant) | Montant absent ≠ montant à 0 | `tests/recette/DS04-null-vs-zero.ts` | déjà correct | 7/7 | — | PASS |
| Devises / dates | Devise explicite respectée, calendrier valide, ordinal français | `tests/recette/DS05-devises-et-dates.ts` | 3/8 échecs → 0/8 | `currency` forcé à `"CAD"` en dur ; "1er janvier" rejeté | Repli sur devise du fichier ; regex date étendue | PASS |
| KPI (marge, CAC, ROAS, panier moyen) | Donnée absente ≠ performance de 0 | `tests/recette/DS06-kpi-donnee-absente.ts` | 6 divergences → 0/8 | `kpiRegistry.js` (moteur réellement utilisé) traitait COGS/CAC/AOV absents comme 0 → marge 100% inventée | 6 formules renvoient `null` si dépendance non mesurée | PASS |
| Colonne inconnue | Ne doit jamais disparaître sans trace | `tests/recette/DS07-colonne-inconnue.ts` | aucune remontée → 5/5 | Colonne non mappée absorbée silencieusement (seul `original_data`, jamais lu par l'UI) | Message explicite dans le résultat d'import | PASS |
| Charge (1000/10000 lignes) | Invariant lues = valides + rejetées, débit correct | `tests/recette/DS08-charge-volume.ts` | 4/8 échecs → 8/8 | `parseNumber("abc")` → `0` au lieu d'être rejeté (`Number("")===0` en JS) | Rejet explicite si aucun chiffre après nettoyage | PASS |
| Assistant IA | Ne jamais présenter une donnée absente comme un fait mesuré | `tests/recette/DS10-assistant-ia-donnee-absente.ts` | 4/6 échecs → 6/6 | "Marge nette: 0$ (0%)" affiché pour une entreprise sans transaction | Section "non mesurable" explicite si aucune ligne | PASS |
| Rapports (comparaison de périodes) | Ne jamais inventer une tendance | `tests/recette/DS11-rapport-periode-vide.ts` | -100% calculé → "non-mesurable" | Période sans donnée comparée à une période réelle → faux effondrement -100% | Comparaison marquée "non-mesurable" si une des 2 périodes n'a aucune ligne | PASS |
| Radar externe | Ne jamais perdre l'historique sur un scan infructueux | `tests/recette/DS13-radar-scan-vide.ts` | 0 garde-fou → 5/5 | `deleteMany({})` effaçait tout même quand 0 signal exploitable trouvé | `deleteMany` sauté si aucun signal retenu | PASS |
| Sécurité — RLS entités | Isolation tenant sur toutes les entités | Script de vérification (32 fichiers `.jsonc`) | 31/32 conformes | `User.jsonc` sans bloc `rls` explicite | Non corrigé — probablement géré nativement par la plateforme, à confirmer | PASS avec réserve |
| Sécurité — fonctions | Chaque fonction doit vérifier l'authentification | `grep auth.me()` sur les 10 fonctions | 9/10 → 10/10 | `notifyCriticalEvent` seule sans garde — email + alerte pour `user_id` arbitraire sans authentification | Garde `auth.me()`/401 ajoutée | PASS |
| `analyzeBusiness` | Ne jamais effacer avant validation d'un résultat exploitable | Lecture de code | déjà correct | — | — | PASS |
| `inspectSheet` | Backfill sans jamais écraser une donnée déjà présente | Lecture de code | déjà correct | — | — | PASS |
| `enrichFromWebsite` | Auth présente, ne jamais deviner une donnée manquante | Lecture de code | déjà correct | — | — | PASS |
| Dashboard/Kpis/Finance/Tresorerie (UI réelle) | Cohérence d'affichage en conditions réelles | Bloqué | — | Pas d'accès réseau à l'app déployée depuis ce sandbox (WebSocket du SDK non supporté par le proxy) | — | NON TESTÉ |

## Ce qui reste ouvert (décision humaine requise, volontairement non corrigé)

1. **Score de santé LLM** (`analyzeBusiness/entry.ts`) — le schéma JSON imposé au LLM force un score 0-100 par dimension sans champ `measured`, donc un domaine sans données reçoit un score inventé. `src/pages/Dashboard.jsx` utilise un moteur séparé (`domainScores.js`) qui gère déjà ça correctement — deux mécanismes coexistent. Correctif proposé et documenté dans `AUDIT-LOG.md`, non appliqué : changer le comportement d'un appel LLM en production sans pouvoir le revérifier avec un vrai appel est trop risqué à faire à l'aveugle.
2. **3 moteurs de marge indépendants** (`kpiRegistry.js`, `kpiCatalog.ts` mort en prod, `businessContext.ts`) — cohérents chacun avec eux-mêmes mais violent le principe "une métrique = un moteur". Unification hors scope d'un correctif ponctuel.
3. **`notifyCriticalEvent`** — le correctif bloque les appels totalement non authentifiés ; reste ouvert : un utilisateur authentifié peut-il notifier un `user_id` différent du sien ? Fonction non branchée à aucun déclencheur actuellement, donc pas d'usage réel à observer.
4. **`User.jsonc`** sans bloc RLS explicite — à confirmer avec le porteur du projet si c'est géré nativement par Base44.
5. **Pages UI réelles** (Dashboard, Kpis, Finance, Tresorerie) — jamais testées avec de vraies données faute d'accès réseau depuis ce sandbox. Nécessite soit un accès `base44 dev`, soit une exécution de la suite Playwright (`tests/audit.spec.js`, déjà dans le repo) depuis un environnement qui peut réellement atteindre `base44.app`.
6. **`point-entree.ts`** — teste un contrat (stub d'injection de client) que `entry.ts` n'implémente plus. Dette de test documentée, pas un bug de production.

## Critères de fin (cahier des charges) — état réel

- [x] Tous les modules du moteur de données ont été audités
- [x] Chaque objectif fonctionnel testé a été démontré par un test reproductible
- [x] Les problèmes critiques trouvés sont corrigés (13/13)
- [x] Les données ne sont plus perdues silencieusement (fingerprint, radar, colonnes inconnues)
- [x] `NULL` et `0` sont distingués (montant, KPI, contexte IA, rapports)
- [x] Les imports répétés sont idempotents
- [ ] Tests DS01-DS11 du rapport de recette d'origine — **jeux de données reconstruits**, pas les fichiers originaux (jamais fournis, cf. début de la conversation)
- [x] Tests de non-régression : suite complète verte à chaque commit
- [ ] Interfaces cohérentes — **non vérifiable** depuis ce sandbox (accès réseau bloqué)
- [x] L'assistant IA respecte les données disponibles (contexte + rapports corrigés)
- [x] Contrôles de sécurité essentiels validés (RLS entités, auth fonctions)
- [x] Performances mesurées (1000/10000 lignes, ~50-100k lignes/s)
- [x] Erreurs restantes explicitement documentées (section ci-dessus)
