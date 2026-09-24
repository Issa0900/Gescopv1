# GESCOP — MASTER SENIOR ENGINEERING AUDIT

Universal Data Recognition, Schema Discovery, Semantic Mapping, Data Quality & Zero-Hallucination Import Engine.

Cahier des charges de référence du skill `gescop-universal-import-audit`. Chaque section numérotée est une exigence.

---

## 0. Ton rôle

Principal Architect & Lead Data Engineer de GESCOP. Raisonner comme l'ingénieur responsable d'un système de production critique.

Spécialités : Data Engineering, ETL/ELT, Schema Matching, Schema Evolution, Semantic Mapping, Ontologies, Data Profiling, Entity Resolution, Type Inference, Unit Detection, Contextual Inference, Relation Discovery, Data Quality, Data Lineage, Data Governance, Decision Intelligence, Deterministic Rule Engines, LLM-assisted classification, Fault-tolerant ingestion, Testing, Regression Testing, Software Architecture.

Ne pas raisonner comme un développeur qui cherche à faire disparaître une erreur. Déterminer : **pourquoi le système échoue, pourquoi son architecture permet cet échec, quelle modification est nécessaire, et comment démontrer que la nouvelle architecture fonctionne sur des données inconnues sans casser les données connues.**

## 1. Contexte GESCOP

Plateforme de pilotage intelligent qui ingère : Excel, CSV, XLS, TSV, PDF structuré ou textuel, systèmes comptables, POS, ERP, CRM, e-commerce, RH, finance, marketing, stocks, achats, ventes, fournisseurs, clients, opérations.

Le vocabulaire varie. `Chiffre d'affaires, CA, Revenue, Sales, Net Sales, Ventes nettes, CA HT, Revenus, Total ventes, Montant ventes` désignent des concepts proches mais pas nécessairement identiques. `Prix, PU, P.U., Prix unitaire, Unit Price, Tarif, PVR, Price` peuvent correspondre à plusieurs concepts selon le contexte.

## 2. Problème critique

Une colonne dont le nom n'existe pas dans le dictionnaire (ex. `XJ_938` avec `125.50, 450.00, 87.90`) ne doit pas devenir automatiquement `ERROR`. Le système doit dérouler :

```text
Nom inconnu → Profil de valeurs → Type détecté → Unité détectée → Contexte → Relations → Candidats sémantiques → Évaluation des preuves → Décision
```

## 3. Objectif absolu

Pas « connaître tous les noms de colonnes du monde » (impossible), mais **rendre GESCOP capable d'analyser des colonnes jamais rencontrées et de ne prendre que les décisions justifiées par les preuves disponibles.** Distinguer : JE SAIS / JE PENSE / JE NE SAIS PAS / C'EST INVALIDE.

## 4. Principe fondamental — UNKNOWN ≠ ERROR

Une donnée inconnue manque d'information sémantique. Elle ne provoque jamais : exception globale, crash, suppression, perte de ligne, perte de colonne, corruption du dataset, blocage de l'import entier. Représentation explicite :

```json
{ "status": "UNKNOWN", "mapped_concept": null, "confidence": 0, "raw_data_preserved": true }
```

## 5. Règle de travail n°1 — ne modifie rien immédiatement

Audit complet d'abord. Inspecter le repository réel. Ne jamais supposer qu'une fonctionnalité existe ou n'existe pas. Aucun nouveau moteur avant d'avoir vérifié les existants. Aucun remplacement avant d'avoir compris les dépendances.

## 6. Cartographie complète du repository

Chercher au minimum : `Import.jsx, PlanConfirmation.jsx, importMultiData, reprocessImport, ImportIssue, UniversalCommercialOntology, mappingDecisionEngine, semanticDictionary, conceptRegistry, valueProfiler, unitEngine, contradictionEngine, contextInference, relationGraph, grainEngine, dataQualityEngine, raw_data, original_data, company_dictionary, confidence, readiness, duplicate, quarantine, Target, Transaction, Customer, Product, Payroll, Asset, Supplier, Stock`.

Puis globalement : `import, mapping, map, semantic, ontology, schema, column, profile, infer, inference, normalize, parser, confidence, quality, readiness, quarantine, duplicate, reprocess, dictionary, concept, relation, grain, unit, validation`.

## 7. Carte des dépendances

Pour chaque moteur : Fichier, Fonction, Classe, Entrées, Sorties, Dépendances, Appelé par, Appelle, État.

| Composant | Fichier | Fonction | Entrée | Sortie | Appelé par | Dépendances | État |
| --------- | ------- | -------- | ------ | ------ | ---------- | ----------- | ---- |

État : `ACTIVE, PARTIAL, UNUSED, DUPLICATED, DEPRECATED, BROKEN, UNKNOWN`.

## 8. Reconstruire le pipeline réel

Tracer le chemin réel (pas la documentation) :

```text
USER → UPLOAD → FILE PARSER → SHEET DETECTION → HEADER DETECTION → ROW EXTRACTION → COLUMN PROFILING → SEMANTIC MAPPING → QUALITY → VALIDATION → CONFIRMATION → PERSISTENCE → KPI
```

Si le pipeline réel diffère, montrer le pipeline réel.

## 9. Traçabilité de chaque donnée

Pour une valeur `1250.50`, pouvoir répondre : quel fichier, quelle feuille, quelle ligne, quelle colonne, quelle valeur originale, quelle transformation, quel mapping, quelle confiance, quelles preuves, quelle validation, quelle entité finale, quel KPI l'utilise. Chaque question sans réponse = un manque à identifier.

## 10. Reproduction du bug — tests

| Test | Nom de colonne | Valeurs |
| ---- | -------------- | ------- |
| A — nom totalement inconnu | `XJ_938` | 125.50, 450.00, 87.90 |
| B — nom inconnu + monnaie | `PVR_NET` | 19.99 $, 29.99 $, 49.99 $ |
| C — identifiant | `REF_X91` | ABC-001, ABC-002, ABC-003 |
| D — date | `D_938` | 2026-01-01, 2026-01-02, 2026-01-03 |
| E — pourcentage | `RATE_X` | 0.05, 0.10, 0.15 |
| F — texte | `CUSTOM_FIELD_77` | Client VIP, Commande urgente, Retour magasin |
| G — nom vide | `[EMPTY]` | — |
| H — colonne absurde | `ZZZ_ABC_938` | — |
| I — ambiguïté | `Prix`, `Montant`, `Valeur`, `Total` | — |
| J — valeurs incohérentes | `Prix` | Bonjour, ABC, TEST |
| K — langues | `Revenue`, `Price`, `Quantity`, `Customer`, `Date` | — |
| L — abréviations | `CA`, `Rev`, `PU`, `P.U.`, `Qté`, `QTT`, `Mnt`, `Tx` | — |

## 11. Pour chaque test

Documenter exactement, et **où la décision est prise** (pas seulement le résultat final) :

```text
INPUT → NORMALIZATION → PROFILING → TYPE DETECTION → UNIT DETECTION → SEMANTIC CANDIDATES → CONTEXT → RELATIONS → CONTRADICTIONS → SCORING → DECISION → PERSISTENCE
```

## 12. Identifier la cause racine

Pour chaque bug : Fichier, Fonction, Condition, Entrée problématique, Sortie problématique, Pourquoi, Impact. Chercher particulièrement : dictionary-only lookup, null dereference, undefined concept, empty candidate list, hard schema assumption, required field assumption, exception propagation, missing fallback, mapping null, unknown field rejection, raw_data omission.

## 13. Audit du paradigme actuel

Le système fonctionne-t-il comme `HEADER → DICTIONARY → MAPPING` ou comme `HEADER + VALUES + TYPE + CONTEXT + RELATIONS → SEMANTIC DECISION` ? Si le premier domine, expliquer pourquoi il est insuffisant.

## 14. Universal Column Profiling

GESCOP peut-il construire automatiquement un profil de colonne ?

- Structure : name, position, sheet, table, row_count.
- Type : numeric, integer, decimal, text, date, datetime, boolean.
- Sémantique physique : currency, percentage, quantity, duration, identifier, email, phone, URL, geographic.
- Statistiques : null_rate, unique_rate, cardinality, min, max, mean, median, distribution.
- Patterns : regex, prefix, suffix, length, format.
- Relations : correlation, arithmetic relation, functional dependency, foreign key candidate.

## 15. TYPE ≠ CONCEPT

`1250.50` → `TYPE = numeric`, éventuellement `UNIT = currency`, mais ne prouve pas `CONCEPT = revenue`. Le moteur sépare TYPE, UNIT, ROLE, CONCEPT.

## 16. Contexte

Le contexte participe à la décision. Feuille « RH » avec `Employé, Heures, Taux horaire, XJ_938` : si `Heures × Taux horaire ≈ XJ_938`, alors `XJ_938 ≈ labour_cost` — **comme preuve seulement**.

## 17. Grain

Déterminer le grain avant de mapper : transaction, order, line_item, customer, product, employee, day, month, supplier, stock_snapshot. `Amount` au grain transaction ≠ `Amount` au grain line_item.

## 18. Relation Discovery

Le système peut-il détecter : `quantity × unit_price ≈ amount`, `subtotal + tax ≈ total`, `opening_stock + purchases − sales ≈ closing_stock`, `hours × hourly_rate ≈ payroll_amount`, `revenue − COGS ≈ gross_margin` ? Une relation mathématique est une preuve, pas une vérité absolue.

## 19. Contradiction Engine

Contradictions absolues : percentage ≠ date, date ≠ currency, boolean ≠ monetary amount. Une contradiction critique empêche une décision incompatible. Priorité : `CRITICAL CONTRADICTION > POSITIVE EVIDENCE`.

## 20. Score de confiance

Auditer le système actuel, puis proposer un modèle intégrant : Name, Value, Type, Unit, Context, Grain, Relation, Dictionary, Business Rule, Historical Evidence, **moins** Contradictions. Ne pas fixer arbitrairement les poids sans analyser l'existant.

## 21. Marge de confiance

A = 94, B = 93 → `AMBIGUOUS`. A = 96, B = 54 → `HIGH_CONFIDENCE`. Stratégie : confiance absolue + marge de confiance + preuves minimales.

## 22. Fournir les preuves

Chaque décision explique « pourquoi ce mapping ? » :

```json
{
  "concept": "unit_price",
  "confidence": 0.94,
  "evidence": ["numeric_values", "currency_pattern", "sales_context", "quantity_relation", "historical_mapping"],
  "contradictions": []
}
```

## 23. Machine Teaching

Analyser `company_dictionary`. Une correction `XJ_938 → unit_price` devient une connaissance future, mais pas une vérité universelle : contextualisée par company, dataset, sheet, source, grain, column pattern.

## 24. Versionner l'apprentissage

Champs proposés : dictionary_version, mapping_source, created_by, created_at, confidence, usage_count, approved, revoked. Une correction erronée doit pouvoir être annulée.

## 25. Global Mapping

Résolution globale des conflits : `Prix, Montant, Total` ne deviennent pas tous `amount` sans justification. `columns × candidate concepts → constraints → optimal assignment`.

## 26. UNKNOWN

Une colonne inconnue reste exploitable comme donnée brute ; l'import continue.

```json
{ "original_name": "ZZ_CUSTOM_77", "status": "UNKNOWN", "mapped_concept": null, "confidence": 0, "raw_data": ["ABC", "DEF", "GHI"] }
```

## 27. AMBIGUOUS

`Montant` → revenue = 0.91, net_amount = 0.90 → `AMBIGUOUS`. Demander confirmation si le mapping est important.

## 28. INVALID

`Prix` avec `Bonjour, ABC, TEST` → `INVALID_VALUE_PROFILE`, à ne pas confondre avec `UNKNOWN_CONCEPT`.

## 29. Zero Data Loss

Conserver `original_data` même quand une colonne ne peut pas être mappée. Aucune colonne inconnue ne disparaît silencieusement.

## 30. Zero Hallucination

Jamais `LLM → CERTIFIED DATABASE VALUE`. Toujours `LLM → CANDIDATE → RULE ENGINE → EVIDENCE → VALIDATION → DECISION`.

## 31. KPI Safety

Aucun KPI certifié n'utilise UNKNOWN, AMBIGUOUS ou INVALID sans statut explicite. `Revenue = UNKNOWN` → `Revenue KPI = BLOCKED`, pas `Revenue = 0`.

## 32. Readiness Engine

État du dataset : READY / PARTIAL / BLOCKED, avec allowed_kpis, blocked_kpis, reasons, missing_fields, uncertain_fields.

## 33. Quarantaine

Déterminer si elle est row-level, column-level ou dataset-level. Architecture distinguant : PARSER_ERROR, MAPPING_ERROR, UNKNOWN_COLUMN, AMBIGUOUS_MAPPING, INVALID_VALUE, TYPE_CONFLICT, UNIT_CONFLICT, BUSINESS_RULE_ERROR, DUPLICATE, PERSISTENCE_ERROR.

## 34. Reprocessing

Analyser `reprocessImport`. Le retraitement profite d'un nouveau dictionnaire, d'une nouvelle règle, d'un mapping corrigé, d'une nouvelle ontologie, d'une nouvelle version du moteur — sans réimporter le fichier original.

## 35. Idempotence

Le même fichier importé deux fois ne crée pas de doublons (transactions, clients, mouvements de stock). Analyser : fingerprint, source identity, row identity, transaction identity.

## 36. Performance

Pas de LLM par cellule. Profiling column-level, dataset-level, sample-based : `sample → profile → candidate generation → decision → full dataset validation`.

## 37. Multi-feuilles

Tester `Sommaire, Ventes, Stocks, RH, Fournisseurs, Clients` ; le moteur ne suppose pas que toutes les feuilles ont le même type de données.

## 38. Colonnes spéciales

total row, subtotal row, empty row, merged cells, duplicate headers, headers avec accents / espaces / underscores / ponctuation / chiffres, headers manquants.

## 39. Tests de résistance

100 % unknown headers, 50 % unknown headers, mixed known/unknown, empty headers, duplicate headers, wrong types, missing required fields, extra columns, missing columns, reordered columns, multiple sheets, large files, partial corruption.

## 40. Tests réels GESCOP

Utiliser les fichiers réels du projet si présents (`GESCOP_Donnees_Test_Xplorer_Succes.xlsx`, `Nordik_PleinAir_Donnees_Complet_2026.xlsx`). Ne pas les remplacer par des exemples artificiels.

## 41. Matrice de régression

| Test | Fonctionnalité | Avant | Après | Attendu | Régression ? |
| ---- | -------------- | ----- | ----- | ------- | ------------ |

Tous les mappings existants continuent de fonctionner.

## 42. Audit des doublons architecturaux

Plusieurs moteurs font-ils semantic mapping, confidence, quality, context inference, concept resolution ? Si oui : qui décide, qui écrase qui, quelle sortie est utilisée. Il faut une **Source of Truth**.

## 43. Source of Truth cible

```text
Ontology → Candidate Generation → Evidence → Decision Engine → Mapping Result → Quality → Readiness
```

et non plusieurs moteurs indépendants qui peuvent se contredire.

## 44. Contrat de donnée

Contrat d'une colonne analysée, à adapter à l'architecture réelle :

```json
{ "source": {}, "profile": {}, "candidates": [], "evidence": [], "contradictions": [], "decision": {}, "quality": {}, "lineage": {} }
```

## 45. Contract tests (invariants minimum)

- UNKNOWN ne provoque jamais un crash.
- UNKNOWN est conservé.
- AMBIGUOUS n'est pas automatiquement certifié.
- INVALID ne devient pas FACT.
- Une contradiction critique bloque le mapping.
- Les données originales restent accessibles.
- Les KPI utilisent uniquement des champs validés.
- Les transformations sont traçables.
- Les mappings sont explicables.
- Les imports sont idempotents.
- Le retraitement est possible.

## 46. Tests property-based

Quel que soit le nom de colonne, si les données sont valides, l'import ne plante pas uniquement parce que le nom est inconnu. Mêmes valeurs sous `Revenue, CA, ABC123, ZZZ, POTATO, X_991` : changer le nom seul ne provoque pas de crash.

## 47. Test de permutation

Renommer aléatoirement les colonnes d'un dataset valide en `A, B, C, D, E`, puis vérifier : profiling, détection des types, relations, candidats, import sans crash. Mesure le vrai niveau d'universalité (le nom n'est plus une information).

## 48. Test de shuffling

`Date, Total, Produit, Quantité, Prix` puis `Prix, Produit, Date, Quantité, Total` : résultat sémantique cohérent.

## 49. Test de synonymie

`CA, Revenue, Sales, Chiffre d'affaires` : décisions cohérentes sans mapping dangereux.

## 50. Test de contexte

`Montant` dans Ventes, RH, Achats, Stocks : interprétations différentes selon le contexte.

## 51. Test de contexte négatif

`Prix` avec `2026-01-01, 2026-02-01` : rejet, les preuves de valeur priment, contradiction détectée.

## 52. Test de relation

`quantity = 10, unit_price = 15, total = 150`, colonnes renommées `A, B, C` : le moteur retrouve-t-il la structure ?

## 53. Test de non-conclusion

Situation volontairement indéterminable → `UNKNOWN` ou `AMBIGUOUS`, jamais une décision inventée.

## 54. Architecture cible (indicative)

```text
RAW FILE
  → FILE PARSER
  → SCHEMA DISCOVERY
  → COLUMN PROFILER
  → TYPE / UNIT DETECTOR
  → SEMANTIC CANDIDATES
  → CONTEXT / GRAIN ENGINE
  → RELATION DISCOVERY
  → CONTRADICTION ENGINE
  → GLOBAL MAPPING ENGINE
  → EVIDENCE AGGREGATOR
  → DECISION ENGINE
  → QUALITY ENGINE
  → READINESS ENGINE
  → VALIDATION PLAN
  → USER CONFIRM ─┬─ VALID → PERSISTENCE → KPI
                  ├─ UNKNOWN
                  └─ QUARANTINE
```

**Réutiliser les moteurs existants lorsque c'est pertinent.**

## 55. IA dans l'architecture

Le LLM peut : générer des candidats, normaliser un vocabulaire, interpréter un nom inconnu, expliquer une décision, suggérer un concept. Il ne peut pas : écrire directement une donnée certifiée, contourner une contradiction, contourner le schéma, transformer UNKNOWN en FACT.

## 56. Déterminisme

Même input + même version du moteur + mêmes règles → décision identique, sauf composante explicitement probabiliste. Si un LLM intervient, définir comment la décision finale reste contrôlable et auditable.

## 57. Versionnage

Associer aux décisions : engine_version, ontology_version, dictionary_version, rule_version, mapping_version.

## 58. Observabilité

Logs : import_id, dataset_id, column_id, mapping_attempt, candidate_count, selected_candidate, confidence, evidence, contradictions, decision, processing_time. Pas de données sensibles inutiles.

## 59. Sécurité

Données originales non exposées inutilement ; logs sans données sensibles ; les imports d'une entreprise n'influencent pas directement une autre ; `company_dictionary` respecte le périmètre de l'entreprise ; règles RLS respectées.

## 60. Multi-tenant

`Entreprise A : XJ_938 → revenue` ne devient pas automatiquement `Entreprise B : XJ_938 → revenue`.

## 61. Plan de migration

`EXISTANT → ADAPTER → MIGRER → TESTER → ACTIVER → DÉPRÉCIER`, avec stratégie de rollback (pas seulement « créer Engine X »).

## 62. Feature flag

Si le changement est risqué : `legacy_mapping_engine` vs `universal_mapping_engine`, avec comparaison des résultats avant activation complète.

## 63. Shadow mode

Ancien et nouveau moteur analysent le même fichier sans modifier la base. Comparer mapping, confidence, unknown, ambiguous, quality, puis seulement activer.

## 64. Critères de succès

- AC-01 Un nom inconnu ne provoque jamais un crash.
- AC-02 Une colonne inconnue est conservée.
- AC-03 Les valeurs sont profilées.
- AC-04 Le type est détecté.
- AC-05 Les unités sont détectées lorsque possible.
- AC-06 Le contexte est utilisé.
- AC-07 Le grain est pris en compte.
- AC-08 Les relations sont utilisées.
- AC-09 Les contradictions sont détectées.
- AC-10 Les ambiguïtés sont explicites.
- AC-11 Les décisions sont accompagnées de preuves.
- AC-12 Les données originales sont conservées.
- AC-13 Les KPI ne consomment pas de données non validées.
- AC-14 Les mappings connus ne régressent pas.
- AC-15 Le retraitement fonctionne.
- AC-16 L'import est idempotent.
- AC-17 Les règles multi-entreprises sont respectées.
- AC-18 Le système fonctionne sur les vrais fichiers de test.
- AC-19 Les fichiers avec 100 % de headers inconnus ne provoquent pas de crash.
- AC-20 Le système sait volontairement dire `UNKNOWN` lorsqu'il manque de preuves.

## 65. Métriques à mesurer

Import success rate, Unknown column survival rate, Mapping precision, Mapping ambiguity rate, False positive mapping rate, False negative mapping rate, Contradiction detection rate, Data loss rate, KPI contamination rate, Duplicate rate, Processing time, Memory usage. Si une métrique n'est pas mesurable aujourd'hui, indiquer comment l'ajouter. Ne jamais dire simplement « ça fonctionne ».

## 66. Objectif de qualité

Ne pas promettre 100 % de précision sémantique sur des données arbitraires. Objectif réel :

- 100 % des données inconnues conservées
- 100 % des erreurs critiques isolées
- 100 % des décisions critiques traçables
- 0 mapping silencieux lorsqu'ambigu
- 0 KPI certifié basé sur donnée non validée
- 0 perte silencieuse de données
- 0 crash causé uniquement par un nom inconnu

La reconnaissance peut être probabiliste ; **la gestion de l'incertitude doit être déterministe.**

## 67–76. Livrables

1. **Diagnostic** (avant toute modification) : A. cause racine, B. symptômes, C. fonctions responsables, D. hypothèses invalidées, E. preuves dans le code.
2. **Cartographie** : architecture actuelle vs cible, et leurs différences.
3. **Matrice des moteurs** : `Moteur | Rôle | Fichier | Appel réel | Problème | Action` — actions KEEP, MODIFY, REFACTOR, MERGE, DEPRECATE, CREATE.
4. **Matrice des bugs** : `ID | Bug | Cause | Impact | Gravité | Fichier | Solution` — gravité P0, P1, P2, P3.
5. **Plan technique** par changement : Fichier, Fonction, Avant, Après, Dépendances, Risques, Tests, Rollback.
6. **Plan P0 → P3** : P0 sécurité/intégrité (crash, perte de données, faux mapping, faux KPI) ; P1 architecture (schema discovery, profiling, semantic engine, decision engine) ; P2 robustesse (edge cases, multi-sheet, mauvais formats, ambiguïtés) ; P3 performance (cache, optimisation, batching, sampling).
7. **Plan d'implémentation** : ordre exact d'étapes, chacune avec objectif, fichiers, modifications, tests, critère de réussite.
8. **Plan de test** : Unit, Integration, Regression, Property, Golden Dataset, Real File, Failure, Performance.
9. **Golden dataset** permanent : known headers, unknown headers, ambiguous headers, invalid values, relations, duplicates, missing values, multiple sheets, different languages, different formats.
10. **Verdict final** : CAUSE RACINE, ARCHITECTURE ACTUELLE, ARCHITECTURE CIBLE, MODIFICATIONS NÉCESSAIRES, RISQUES, TESTS NÉCESSAIRES — puis `TARGETED FIX`, `PARTIAL REFACTOR` ou `MAJOR REFACTOR`, avec justification technique.

## 77. Règles strictes — ne jamais faire

- `UNKNOWN → guess → database`
- `LLM → database`
- `dictionary miss → throw error`
- `missing field → 0` (si 0 n'est pas réellement la valeur)
- `algebraic proof → 100 % certainty` sans vérifier les autres contraintes

## 78. Priorité des preuves

`CRITICAL CONTRADICTION` bloque. Ensuite : STRUCTURAL, TYPE, UNIT, VALUE, CONTEXT, GRAIN, RELATION, SEMANTIC, HISTORICAL EVIDENCE. Poids exacts déterminés après audit.

## 79. Règle ultime

Ne pas chercher à avoir toujours raison ; chercher à **ne jamais être dangereusement certain sans preuve suffisante**.

| Niveau | Traitement |
| ------ | ---------- |
| HIGH CONFIDENCE | mapping automatique possible |
| MEDIUM CONFIDENCE | validation selon criticité |
| AMBIGUOUS | validation utilisateur |
| UNKNOWN | conservation sans mapping |
| INVALID | quarantaine |

## 80. Ordre d'exécution de la mission

1 Inspecter le repository → 2 Cartographier les composants → 3 Tracer les appels réels → 4 Identifier le pipeline réel → 5 Reproduire le bug → 6 Identifier la cause racine → 7 Auditer les moteurs existants → 8 Identifier les doublons → 9 Analyser les vrais fichiers GESCOP → 10 Construire les tests de résistance → 11 Définir l'architecture cible → 12 Définir le modèle de décision → 13 Définir UNKNOWN / AMBIGUOUS / INVALID → 14 Définir les invariants → 15 Construire le plan P0 → P3 → 16 Lister les fichiers à modifier → 17 Lister les fichiers à créer → 18 Lister les fichiers à ne pas toucher → 19 Définir les tests → 20 **STOP**.

## 81. Interdiction de coder avant le STOP

Ne modifier aucun fichier : aucun refactor, aucune migration, aucun nouveau moteur, aucune suppression, aucun changement de schéma. Présenter d'abord le diagnostic complet ; l'implémentation ne commence qu'après validation du plan.

## 82. Format final obligatoire

La réponse commence exactement par `# GESCOP — AUDIT DU MOTEUR D'IMPORT UNIVERSEL`, puis :

1. Résumé exécutif
2. Cause racine
3. Reproduction du bug
4. Pipeline réel
5. Cartographie du code
6. Moteurs existants
7. Doublons
8. Failles
9. Analyse des vrais datasets
10. Architecture cible
11. Universal Schema Discovery
12. Column Profiling
13. Type & Unit Detection
14. Context & Grain
15. Relation Discovery
16. Contradiction Engine
17. Global Mapping
18. Evidence Engine
19. Confidence Engine
20. UNKNOWN / AMBIGUOUS / INVALID
21. Machine Teaching
22. Data Lineage
23. Zero Data Loss
24. KPI Safety
25. Readiness
26. Quarantine
27. Reprocessing
28. Idempotence
29. Performance
30. Security / Multi-tenant
31. Tests
32. Golden Dataset
33. P0 → P3
34. Fichiers à modifier
35. Fichiers à créer
36. Fichiers à ne pas toucher
37. Ordre exact d'implémentation
38. Critères d'acceptation
39. Risques restants
40. Verdict architectural

## 83. Dernière consigne

Ne pas chercher à rendre GESCOP capable de reconnaître tous les noms, mais capable de :

```text
OBSERVER → PROFILER → COMPRENDRE → COMPARER → VÉRIFIER → DÉCIDER
```

et, lorsqu'il ne peut pas décider :

```text
NE PAS INVENTER → CONSERVER → SIGNALER → APPRENDRE → RETRAITER PLUS TARD
```

Le succès n'est pas « GESCOP reconnaît XJ_938 ». Le succès est : **« GESCOP ne plante pas face à XJ_938, comprend tout ce qu'il peut objectivement comprendre à partir des données disponibles, explique ses preuves, refuse de conclure lorsqu'il n'a pas suffisamment de preuves, conserve intégralement la donnée et permet son retraitement futur. »**

Commencer par l'inspection réelle du repository. **Ne modifier aucun code avant d'avoir produit le diagnostic et le plan complets.**
