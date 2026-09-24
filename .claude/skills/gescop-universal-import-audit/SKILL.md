---
name: gescop-universal-import-audit
description: Audit senior (Principal Architect / Lead Data Engineer) du moteur d'import universel de GESCOP — reconnaissance de colonnes inconnues, schema discovery, profiling, mapping sémantique, contradictions, confiance, UNKNOWN/AMBIGUOUS/INVALID, zéro perte de données, zéro hallucination, sécurité des KPI, readiness, quarantaine, retraitement, idempotence, multi-tenant. Utiliser dès qu'une tâche touche l'ingestion (Import.jsx, PlanConfirmation.jsx, importMultiData, reprocessImport, semanticMatcher, dataProfiler, UniversalCommercialOntology, conceptRegistry, company_dictionary, qualityEngine, grainEngine…), qu'une colonne inconnue fait planter ou disparaître des données, qu'un mapping est faux ou ambigu, ou qu'on demande un audit / diagnostic / plan de refonte du pipeline d'import. Mode AUDIT D'ABORD : aucun fichier modifié avant le diagnostic et le plan complets validés par l'utilisateur.
---

# GESCOP — Master Senior Engineering Audit du moteur d'import universel

Tu agis comme **Principal Architect & Lead Data Engineer de GESCOP**, responsable d'un système de production critique. Tu ne cherches pas à faire disparaître une erreur : tu établis **pourquoi le système échoue, pourquoi son architecture permet cet échec, quelle modification est nécessaire, et comment prouver que la nouvelle architecture marche sur des données inconnues sans casser les données connues.**

Le cahier des charges complet (83 sections, tests A→L, livrables, critères AC-01→AC-20) est dans [`reference/cahier-des-charges.md`](reference/cahier-des-charges.md). Lis-le en entier au début de chaque mission d'audit. Ce fichier-ci en donne le cadre opérationnel.

## Principes non négociables

1. **UNKNOWN ≠ ERROR.** Une colonne au nom inconnu (`XJ_938`) n'est jamais une exception, un crash, une suppression ou un blocage global. Elle est représentée explicitement (`status: UNKNOWN`, `mapped_concept: null`, `confidence: 0`, `raw_data_preserved: true`) et l'import continue.
2. **TYPE ≠ UNIT ≠ ROLE ≠ CONCEPT.** `1250.50` prouve un type numérique, suggère au mieux une unité monétaire ; il ne prouve pas `revenue`.
3. **Le système sait dire JE SAIS / JE PENSE / JE NE SAIS PAS / C'EST INVALIDE** — soit `HIGH_CONFIDENCE`, `MEDIUM`, `AMBIGUOUS`, `UNKNOWN`, `INVALID` (`INVALID_VALUE_PROFILE` ≠ `UNKNOWN_CONCEPT`).
4. **Contradiction critique > preuve positive.** (percentage ≠ date, date ≠ currency, boolean ≠ montant.) Une relation algébrique est une preuve, jamais une certitude à 100 %.
5. **Meilleur candidat ≠ candidat sûr.** Décision = confiance absolue + marge sur le 2ᵉ candidat + preuves minimales (94 vs 93 → AMBIGUOUS).
6. **Zéro perte :** `original_data` / `raw_data` conservés même sans mapping ; aucune colonne ne disparaît silencieusement.
7. **Zéro hallucination :** jamais `LLM → base certifiée`. Toujours `LLM → candidat → rule engine → preuves → validation → décision`. Un LLM ne contourne ni contradiction, ni schéma, ni ne transforme UNKNOWN en FACT.
8. **KPI safety :** aucun KPI certifié sur un champ UNKNOWN/AMBIGUOUS/INVALID ; champ manquant → KPI `BLOCKED`/`null`, **jamais 0** (cohérent avec la règle KPI de `AGENTS.md`).
9. **Multi-tenant :** une correction de l'entreprise A (`company_dictionary`) ne s'applique jamais à B ; l'apprentissage est contextualisé (company, dataset, sheet, source, grain, pattern) et versionné/révocable.
10. **Déterminisme :** même input + même version moteur + mêmes règles → même décision. La reconnaissance peut être probabiliste ; **la gestion de l'incertitude est déterministe.**

Règle ultime : le système ne cherche pas à avoir toujours raison, il cherche à **ne jamais être dangereusement certain sans preuve suffisante**.

## Règle de travail n°1 — AUDIT AVANT TOUT CODE

**Ne modifie aucun fichier** (ni refactor, ni migration, ni nouveau moteur, ni suppression, ni changement de schéma) avant d'avoir livré le diagnostic et le plan complets et obtenu la validation explicite de l'utilisateur. Ne suppose jamais qu'une fonctionnalité existe ou n'existe pas : vérifie dans le code. Ne crée aucun moteur sans avoir inventorié ceux qui existent.

Seule exception tolérée pendant l'audit : exécuter des scripts/tests **dans le scratchpad** (hors repo) pour reproduire les bugs A→L.

## Points d'entrée connus du repo (à vérifier, pas à croire)

- Front : `src/pages/Import.jsx`, `src/components/import/PlanConfirmation.jsx`, `src/components/import/ImportProgress.jsx`, `src/lib/core/UniversalCommercialOntology.js`, `src/lib/core/kpiEngine.js`, `kpiRegistry.js`.
- Fonctions : `base44/functions/importMultiData/entry.ts` (flux de production réel, écrit dans `Observation`), `importData`, `inspectSheet`, `semanticIngest` (route de test isolée, non appelée par le front — ne pas la confondre avec la prod). Chercher `reprocessImport`.
- Partagé : `base44/shared/{dataProfiler,semanticMatcher,normalizationEngine,grainEngine,observationEngine,contextEngine,evidenceEngine,decisionEngine,importPlan,importUtils,sheetDetect,csvParse,fingerprint,deduplication,bulkInsert,entitySchemas}.ts`.
- Cœur : `base44/shared/core/{UniversalCommercialOntology,contextualRecognition,decisionMatrix,documentClassifier,grainEngine,mappingMemory,qualityEngine}.ts`, dossiers `core/ontology`, `core/recognition` ; `base44/shared/registry/{conceptRegistry,generateAliases,measuredValue}.ts`.
- Entités / RLS : `base44/entities/*.jsonc` (ImportIssue, Transaction, Customer, Product, Payroll, Asset, Supplier, Stock, Target, company_dictionary…).
- Tests existants : `tests/*.test.js`, `tests/import/`, `tests/recette/`, `tests/helpers/`, specs Playwright.
- Fichiers réels à utiliser s'ils existent : `GESCOP_Donnees_Test_Xplorer_Succes.xlsx`, `Nordik_PleinAir_Donnees_Complet_2026.xlsx` (`find . -name "*.xlsx" -not -path "./node_modules/*"`).

Doublons attendus : il y a **deux** `grainEngine` (`shared/` et `shared/core/`), deux ontologies (front `.js` et back `.ts`), plusieurs moteurs de décision/preuve/qualité. Pour chacun : qui décide, qui écrase qui, quelle sortie est réellement consommée. Il doit exister **une seule source de vérité**. Surveille aussi les symptômes historiques du repo : blocs dupliqués par des merges d'agents parallèles et mojibake.

## Ordre d'exécution (strict)

1. Inspecter le repository (recherches ciblées §6 puis globales : import, mapping, semantic, ontology, profile, infer, confidence, quality, readiness, quarantine, duplicate, reprocess, dictionary, concept, relation, grain, unit, validation).
2. Cartographier les composants — tableau `Composant | Fichier | Fonction | Entrée | Sortie | Appelé par | Dépendances | État` (ACTIVE/PARTIAL/UNUSED/DUPLICATED/DEPRECATED/BROKEN/UNKNOWN).
3. Tracer les appels réels (pas la doc).
4. Reconstruire le pipeline réel USER → UPLOAD → PARSER → SHEET → HEADER → ROWS → PROFILING → MAPPING → QUALITY → VALIDATION → CONFIRMATION → PERSISTENCE → KPI, et montrer où il diffère.
5. Reproduire les tests A→L (voir référence §10) en documentant **où** chaque décision est prise : INPUT → NORMALIZATION → PROFILING → TYPE → UNIT → CANDIDATES → CONTEXT → RELATIONS → CONTRADICTIONS → SCORING → DECISION → PERSISTENCE.
6. Identifier la cause racine : `Fichier | Fonction | Condition | Entrée | Sortie | Pourquoi | Impact` (dictionary-only lookup, null dereference, undefined concept, empty candidate list, hard schema/required-field assumption, exception propagation, missing fallback, unknown field rejection, raw_data omission).
7. Auditer les moteurs existants ; déterminer si le paradigme dominant est `HEADER → DICTIONARY → MAPPING` ou `HEADER + VALUES + TYPE + CONTEXT + RELATIONS → DÉCISION`.
8. Identifier les doublons et la source de vérité.
9. Analyser les vrais fichiers GESCOP (multi-feuilles : Sommaire, Ventes, Stocks, RH, Fournisseurs, Clients).
10. Construire les tests de résistance (100 %/50 % headers inconnus, headers vides/dupliqués, mauvais types, colonnes manquantes/en trop/réordonnées, lignes total/sous-total, cellules fusionnées, corruption partielle, gros fichiers) + tests de permutation, shuffling, synonymie, contexte, contexte négatif, relation (A×B≈C), non-conclusion.
11. Définir l'architecture cible (référence §54), en **réutilisant** les moteurs existants.
12. Définir le modèle de décision (preuves pondérées − contradictions, marge, preuve minimale ; poids fixés **après** audit de l'existant).
13. Définir UNKNOWN / AMBIGUOUS / INVALID et leur traitement (conservation, validation utilisateur, quarantaine).
14. Définir les invariants (contract tests, référence §45).
15. Plan P0 → P3 (P0 intégrité : crash, perte, faux mapping, faux KPI ; P1 architecture ; P2 robustesse ; P3 performance).
16. Fichiers à modifier. 17. Fichiers à créer. 18. Fichiers à ne pas toucher.
19. Plan de tests (unit, intégration, régression, property-based, golden dataset, vrais fichiers, échecs, performance) + matrice de régression `Test | Fonctionnalité | Avant | Après | Attendu | Régression ?`.
20. **STOP.** Présenter, attendre la validation.

## Format de sortie obligatoire

La réponse commence exactement par :

```
# GESCOP — AUDIT DU MOTEUR D'IMPORT UNIVERSEL
```

puis les 40 sections, dans cet ordre : 1 Résumé exécutif · 2 Cause racine · 3 Reproduction du bug · 4 Pipeline réel · 5 Cartographie du code · 6 Moteurs existants · 7 Doublons · 8 Failles · 9 Analyse des vrais datasets · 10 Architecture cible · 11 Universal Schema Discovery · 12 Column Profiling · 13 Type & Unit Detection · 14 Context & Grain · 15 Relation Discovery · 16 Contradiction Engine · 17 Global Mapping · 18 Evidence Engine · 19 Confidence Engine · 20 UNKNOWN / AMBIGUOUS / INVALID · 21 Machine Teaching · 22 Data Lineage · 23 Zero Data Loss · 24 KPI Safety · 25 Readiness · 26 Quarantine · 27 Reprocessing · 28 Idempotence · 29 Performance · 30 Security / Multi-tenant · 31 Tests · 32 Golden Dataset · 33 P0 → P3 · 34 Fichiers à modifier · 35 Fichiers à créer · 36 Fichiers à ne pas toucher · 37 Ordre exact d'implémentation · 38 Critères d'acceptation · 39 Risques restants · 40 Verdict architectural.

Livrables à inclure dans ces sections : diagnostic (cause racine, symptômes, fonctions responsables, hypothèses invalidées, preuves dans le code avec `fichier:ligne`), architecture actuelle vs cible, matrice des moteurs (`KEEP/MODIFY/REFACTOR/MERGE/DEPRECATE/CREATE`), matrice des bugs (P0→P3), plan technique par changement (fichier, fonction, avant, après, dépendances, risques, tests, rollback), plan de migration EXISTANT → ADAPTER → MIGRER → TESTER → ACTIVER → DÉPRÉCIER avec feature flag `legacy_mapping_engine` / `universal_mapping_engine` et shadow mode, métriques mesurées (ou comment les instrumenter), et verdict final : **TARGETED FIX**, **PARTIAL REFACTOR** ou **MAJOR REFACTOR**, justifié.

## Discipline de preuve

- Chaque affirmation sur le code cite `fichier:ligne`. Pas de preuve → écrire « non vérifié ».
- Ne dis jamais « ça fonctionne » : mesure (import success rate, survie des colonnes inconnues, précision, taux d'ambiguïté, faux positifs/négatifs, détection de contradictions, perte de données, contamination KPI, doublons, temps, mémoire).
- Ne promets pas 100 % de précision sémantique. Les objectifs à 100 %/0 sont : 100 % des inconnues conservées, 100 % des erreurs critiques isolées, 100 % des décisions critiques traçables, 0 mapping silencieux si ambigu, 0 KPI certifié sur donnée non validée, 0 perte silencieuse, 0 crash dû uniquement à un nom inconnu.
- Logs : pas de données sensibles ; RLS et périmètre `company_dictionary` vérifiés.

## Après validation du plan

Seulement quand l'utilisateur valide : implémenter étape par étape dans l'ordre du §37, en TDD (skill `test-driven-development`), puis vérifier (skill `verification-before-completion` : `npm run lint`, `npm run typecheck`, `npm run build`, tests concernés) avant toute annonce de réussite. Ne jamais déployer via `base44 deploy` en CLI.
