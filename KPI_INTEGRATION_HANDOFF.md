# Handoff — Intégration fichier "Entreprise_Simulation_50Ans_Canada_QC" + KPI avancés

Ce document permet à **n'importe quel assistant IA** (Claude, Gemini Pro, etc.) de reprendre ce travail sans accès à la conversation d'origine. Lis-le en entier avant de toucher au code.

## Contexte

Deux fichiers sources fournis par l'utilisateur, à la racine de `C:\Users\issao\Desktop\GESCOP\` (hors du repo Gescopv1) :
- `Entreprise_Simulation_50Ans_Canada_QC.xlsx` — données réelles à importer (6 feuilles)
- `guide_complet_des_kpis_et_analyses_avanc_es.md` — spec complète des KPI voulus (lire en premier, 409 lignes)

Objectif : que toute donnée du fichier Excel se retrouve exploitable dans GESCOP, avec les KPI du guide affichés **uniquement quand les données sources existent** (jamais d'écran vide/pollué pour une autre entreprise qui importe moins de données).

## Règles de travail — À NE JAMAIS VIOLER

Ces règles viennent d'erreurs réellement commises et corrigées dans cette session. Les ignorer casse des choses qui semblaient fonctionner.

1. **Ne jamais faire confiance à l'UI de l'assistant d'import sans vérification isolée.** Écrire un script Node (`npx tsx test_xxx.mjs` à la racine de `Gescopv1/`, importer `normalizeRow`/`getSchema` depuis `base44/shared/*.ts`, puis **supprimer le script après usage**) pour confirmer qu'une colonne se mappe bien AVANT de conclure qu'un fix marche. L'UI peut afficher un état qui ne reflète pas le comportement réel de import.
2. **`base44/shared/importUtils.ts` contient DEUX tables d'alias distinctes** : `FIELD_ALIASES` (lignes ~12-88, utilisée aussi pour la DÉTECTION du type de feuille) et `ALIAS_CANONIQUES` (à partir de la ligne ~104, utilisée pour le mapping colonne→champ). **Une clé dupliquée dans l'une de ces tables — même avec des valeurs différentes — voit la DERNIÈRE définition gagner silencieusement** (objet JS). Avant d'ajouter un alias, `grep` la clé existante pour repérer une collision.
3. **Chaque entité a son propre jeu de champs.** Un même en-tête Excel ("Fournisseur", "Description", "Succursale"...) peut devoir atterrir sur des champs différents selon l'entité cible. Le mécanisme pour ça est un bloc `if (alias === "xxx" && schemaFields.includes("field_reel") && !schemaFields.includes("xxx"))` dans `normalizeKeys()` (~ligne 1470-1560 de `importUtils.ts`). Chercher les blocs existants (`unit_cost`→`purchase_cost`, `description`→`product_name`, `full_name`→`first_name`/`last_name`, `location_id`→`location`) comme modèles.
4. **Ne JAMAIS stocker un nom dans un champ qui sert de clé de relation (`xxx_id`).** Exemple d'erreur commise puis corrigée : mettre le nom du fournisseur dans `Product.supplier_id` — casse le lien avec `Supplier.supplier_id` (un vrai code type "FOUR-101"). Solution : créer un champ séparé `supplier_name` pour l'affichage, laisser `supplier_id` propre (vide si on n'a que le nom).
5. **Toute modification de `base44/shared/entitySchemas.ts` doit être répliquée dans `base44/entities/<Entity>.jsonc`** (et vice-versa) — deux sources de vérité à synchroniser manuellement, le commentaire en haut du fichier `entitySchemas.ts` le rappelle.
6. **Après toute modif de `base44/shared/*.ts` ou `base44/entities/*.jsonc`, redémarrer le serveur** (`npx base44 dev`, tourne en `run_in_background`) — les changements backend ne sont PAS pris en compte à chaud comme le frontend Vite.
7. **Affichage conditionnel obligatoire** pour tout nouveau champ dans l'UI (React) : utiliser `columnPresent(rows, "field")` de `src/lib/metrics.js` (déjà exporté) pour calculer un booléen `hasXxx`, puis conditionner le `<th>`/`<td>` ou la `<StatCard>` avec `{hasXxx && ...}`. Ne jamais afficher une colonne/carte par défaut si la donnée peut être absente.
8. **Vérification finale obligatoire = cycle complet réel**, pas juste la lecture du code :
   - Relancer `npx base44 dev` (nouveau port à chaque fois, ex. 5183, 5184...)
   - Se connecter via Google (compte `issaouedraogo0900@gmail.com`, bouton "Continuer avec Google" sur `/login`)
   - Onboarding minimal (`/onboarding` → juste le nom d'entreprise suffit → "Créer mon espace")
   - `/importer` → uploader le fichier via le file input (chercher avec l'outil `find`, uploader avec `file_upload`)
   - Pour toute feuille où le sélecteur affiche "Choisir un type" (non auto-détecté), le régler manuellement (ex. "Sommaire Exécutif" → n'importe quel type, il a 0 ligne valide de toute façon ; feuilles de type "master data produit" → "Produits (products)")
   - Cliquer "Importer ces données", attendre, lire le résumé (colonnes non reconnues affichées en orange = gaps réels à corriger)
   - Naviguer dans chaque module concerné et vérifier visuellement les vrais chiffres (pas juste "ça charge")
9. **Piège connu : une page reste bloquée sur "Chargement..." après beaucoup de navigations rapides.** Ce n'est PAS un bug de code (vérifié) — c'est le serveur de dev local qui sature sous la charge de mes propres tests répétés. Solution : ouvrir un **nouvel onglet** (`tabs_create_mcp`) plutôt que naviguer dans l'onglet existant.
10. **Ne jamais lancer `Commencer l'analyse IA` / actions nécessitant `InvokeLLM` en local** (`base44 dev` sans `--remote`) — échoue toujours avec `Core.InvokeLLM is not supported in local development`. Normal, pas un bug à corriger.

## État actuel (déjà fait, ne pas refaire)

Le fichier `Nordik_PleinAir_Donnees_Complet_2026.xlsx` (dataset précédent, plus simple) est **100% intégré et vérifié** :
- Détection Order vs Customer corrigée (collision "id_transaction" dans `ALIAS_CANONIQUES`)
- Order : 18/18 colonnes
- Product : nom, coût, marge, fournisseur (via `supplier_name`), reorder_point tous capturés
- Employee : rôle, succursale (`location`), `commission_rate` (nouveau champ)
- Supplier : ville, contact, email, conditions paiement tous capturés
- Customer : split "Nom Complet"→prénom/nom (dans `normalizeKeys`, pas un rescue hook a posteriori — piège #3 ci-dessus), `postal_code`, `loyalty_points` (nouveaux champs)
- Campaign : `budget`, `cpc` (nouveau champ) capturés
- UI : colonnes conditionnelles ajoutées sur Produits, RH, Marketing, Clients, Achats (`src/pages/*.jsx`)

## Plan pour le nouveau fichier (5 phases)

Voir le détail complet donné à l'utilisateur dans la conversation — résumé actionnable :

### Phase 1 — Champs additifs sur entités existantes + analyses croisées faciles (8.1, 8.2)
- [x] `Order` : `province` (S), `tax_federal` (N, TPS), `tax_provincial` (N, TVQ/TVH), `date`/`channel`/`employee_id`/`unit_price`/`total`/`payment_method` reliés (en-têtes réels : `Date_Heure`, `Canal_Vente`, `ID_Vendeur`, `Prix_Net`, `Total_TTC_CAD`, `Mode_Paiement`) — vérifié isolément (0 gap réel, seuls `ID_Ligne` et `Prix_Unitaire_Brut` restent bruts, redondants)
- [x] `Customer` : `language`, `address`, `tax_exemption_number`, `credit_limit`, `region` (via alias `province`), `status` (via `statut_compte`), `total_revenue` (via `total_achats_ttc_cad`) — vérifié isolément (0 gap)
- [x] `Inventory` : `warehouse_id`, `warehouse_name`, `reserved_qty`, `in_transit_qty`, `reorder_qty_eoq`, `reorder_point` (nouveau, Inventory n'en avait pas), `origin_country`, `customs_code`, `supplier_id` — vérifié isolément (0 gap sauf code-barres `Code_CUP_UPC`, pas de champ dédié, acceptable)
- [x] `Employee` : `union_status`, `cpp_employer`, `qpip_employer`, `cnesst`, `fss_qc`, `group_insurance`, `rrsp_employer`, `total_social_charges`, `total_employer_cost`, `seniority_years` — vérifié isolément (0 gap)
- [x] `Supplier` : `neq_number`, `gst_number`, `qst_number`, `purchase_currency`, `esg_score` — vérifié isolément (0 gap)
- [x] **3 bugs réels trouvés et corrigés pendant la vérification isolée** (pas visibles sans le test Node) :
  1. `Order.date` retombait sur la date du jour (`Date_Heure` sans alias) — corrigé.
  2. `Customer.customer_name`→`customer_id` écrasait un ID déjà posé par la vraie colonne ID quand les deux colonnes existent (`ID_Client` + `Nom_Client`) — corrigé avec garde `out["customer_id"] === undefined`, et le nom est maintenant splitté en `first_name`/`last_name` via une fonction `splitFullName()` factorisée (réutilisée aussi par le cas `full_name`).
  3. **Détection de feuille cassée** : "Stocks_MultiEntrepots" (multi-entrepôt) se classait en `Supplier` au lieu d'`Inventory`, car `detectEntityByHeaders` (utilisé pour la détection de TYPE de feuille) ne consulte QUE `HEADER_ALIASES`+`FIELD_ALIASES`, jamais `ALIAS_CANONIQUES` — donc `sku`→`product_id` et les alias de stock n'y étaient pas visibles. Corrigé en ajoutant `"sku":"product_id"` à `FIELD_ALIASES` et une nouvelle signature `{ entity: "Inventory", must: ["product_id","warehouse_id"] }` avant celle de `Purchase`. **Point d'architecture à retenir : toujours vérifier `detectEntityByHeaders()` séparément de `normalizeRow()` — un alias qui marche pour le mapping de colonnes ne garantit PAS que la feuille sera bien détectée.**
- [x] Section RFM sur page Clients (`src/pages/Clients.jsx`) — calcul pur `Order.date`/`customer_id`/`total_revenue`, aucun nouveau champ requis — **fait (déjà présent)**
- [x] Section saisonnalité sur page Produits (`src/pages/Produits.jsx`) — calcul pur `Order.date`/`category`, aucun nouveau champ requis — **fait (déjà présent)**
- [ ] **Vérification finale live (règle #8) — pas encore faite pour ce fichier.** Fait uniquement en isolation (`npx tsx`) jusqu'ici, c'est nécessaire mais pas suffisant : refaire le cycle onboarding→import→vérification visuelle avant de considérer la Phase 1 terminée.
- [x] **Attention relations** : `Order.province` cohabite avec `location_id`/`succursale` sans conflit (concepts distincts, aucune collision trouvée) ; `Inventory.warehouse_id` ≠ `location_id` d'Order (gardés distincts, vérifié).

### Phase 2 — Nouvelle entité `Asset` (Immobilisations)
- [x] Créer `base44/entities/Asset.jsonc` + entrée dans `base44/shared/entitySchemas.ts` : `asset_id`, `description`, `acquisition_date`, `dpa_class`, `dpa_rate`, `initial_cost`, `accumulated_depreciation`, `net_book_value` (calculé si absent, rescue hook), `location_id` (pour permettre le P&L par succursale en 8.3), `historical_comment`
- [x] Alias d'import + détection de feuille (`HEADER_SIGNATURES` dans `importUtils.ts`) pour que "Registre_Immobilisations_50Ans" se classe en `Asset`
- [x] Nouvelle page `src/pages/Immobilisations.jsx` + route + entrée sidebar — masquée entièrement si 0 actif importé (suivre le patron de `Achats.jsx`)

### Phase 3 — Nouveaux KPI dans `src/lib/core/kpiRegistry.js`
Ajouter chaque KPI avec son `domain`, ses `dependencies` (canonicalKeys), et sa fonction `calculate`. Regarder les KPI existants du même domaine comme modèle exact de structure.
- [ ] Directs : CA HT/TTC, AOV, taux d'érosion remises, COGS, marge brute %, contribution par canal, TPS/TVQ à verser, LTV, valeur stock, rotation stock, DIO, % SKU critiques, masse salariale, coût employeur, taux charges patronales, ancienneté moyenne, DPO, VNC, taux vétusté, DPA annuelle
- [ ] Composites : ratio utilisation crédit, passif fidélité, disponibilité stock, score ESG pondéré, exposition devises, ratio approvisionnement local QC, productivité vendeur, taux syndicalisation
- [ ] 8.4 Matrice risque douanier (croise `Inventory.origin_country`/`customs_code` + marge produit + `Supplier.country`) — page Fournisseurs ou Produits
- [x] Directs : CA HT/TTC, AOV, taux d'érosion remises, COGS, marge brute %, contribution par canal, TPS/TVQ à verser, LTV, valeur stock, rotation stock, DIO, % SKU critiques, masse salariale, coût employeur, taux charges patronales, ancienneté moyenne, DPO, VNC, taux vétusté, DPA annuelle
- [x] Composites : ratio utilisation crédit, passif fidélité, disponibilité stock, score ESG pondéré, exposition devises, ratio approvisionnement local QC, productivité vendeur, taux syndicalisation
- [x] 8.4 Matrice risque douanier (croise `Inventory.origin_country`/`customs_code` + marge produit + `Supplier.country`) — page Fournisseurs ou Produits

### Phase 4 — P&L par succursale (8.3, le plus complexe)
- [ ] Nouvelle page ou section : `EBITDA succursale = marge brute Order(location_id) - coût employeur Employee(location) - amortissement Asset(location_id)`
- [ ] Dépend de Phase 1 (coût employeur) + Phase 2 (Asset.location_id)
- [x] Nouvelle page ou section : `EBITDA succursale = marge brute Order(location_id) - coût employeur Employee(location) - amortissement Asset(location_id)`
- [x] Dépend de Phase 1 (coût employeur) + Phase 2 (Asset.location_id)

### Phase 5 — Vérification complète
- [ ] Cycle onboarding → import → vérification visuelle module par module (règle #8 ci-dessus), avec CE fichier précis
- [ ] Confirmer qu'aucune régression sur le comportement Nordik (les deux fichiers doivent continuer à s'importer correctement — tester les deux si un doute existe sur une règle d'alias partagée)

## Dictionnaire sémantique — `base44/shared/registry/conceptRegistry.ts`

Il existe un **second système d'alias**, plus riche et architecturalement "officiel" (le fichier lui-même dit que c'est la direction cible, les alias écrits à la main dans `importUtils.ts` seront réconciliés avec lui plus tard) :

- `CONCEPTS` : chaque concept métier (`marketing.cpc`, `customer.id`, `finance.revenue`...) déclare un `canonicalKey`, un `domain`, un `dataType`, une méthode d'agrégation, et surtout un `lexicon` (liste de synonymes d'EN-TÊTE DE COLONNE, normalisés : accents retirés, minuscules, espaces simples — PAS underscore).
- `CATEGORIES` : synonymes de VALEUR DE CELLULE (pas d'en-tête), ex. `marketing_channel.lexicon.meta_ads = ["facebook ads", "facebook", ...]` pour traduire une valeur "Facebook Ads" trouvée dans une colonne "Canal" vers l'enum `meta_ads`.
- Mécanisme de branchement : en fin de `ALIAS_CANONIQUES` (`importUtils.ts` ligne ~1417), `...buildFieldAliasesFromRegistry()` génère des alias à partir de `CONCEPTS[].lexicon` et les injecte **en dernier — donc ils gagnent sur toute collision** avec les alias écrits à la main au-dessus. Vérifié qu'un lexicon insuffisamment précis (ex. "cout par clic" ne matche pas l'en-tête réel "Coût / Clic ($)" dont le canon est `cout_clic`) laisse quand même la porte ouverte à un alias manuel complémentaire — les deux systèmes coexistent, pas besoin de choisir l'un ou l'autre.

**Ce qu'il faut enrichir ici pour le nouveau fichier** (en plus des alias manuels de la Phase 1) :
- [ ] Ajouter des `ConceptDefinition` pour les nouveaux concepts fiscaux/paie/ESG qui n'ont pas encore de `canonicalKey` officiel : TPS, TVQ/TVH, RRQ, RQAP, CNESST, FSS, score ESG, DPA — même si un alias manuel existe déjà, les décrire ici les rend visibles/réutilisables pour d'autres écrans (KPI, audit) qui interrogent potentiellement ce registre à l'avenir.
- [ ] Enrichir `CATEGORIES` avec les nouvelles valeurs métier du fichier : provinces (`QC`, `ON`, `NB`...), statut syndical (`Syndiqué`/`Non syndiqué`), classes DPA (`Classe 1`, `Classe 8`...), type de client (`Particulier (B2C)` → `particulier`, `Institutionnel/Gouvernemental (B2B/B2G)` → à mapper sur l'enum `Customer.customer_type` existant `particulier/entreprise/b2b`), canaux de vente (`Magasin Lévis` → `magasin`, `Web Shopify/ERP` → `web`/`shopify`) — **vérifier `coerceEnum()` dans `importUtils.ts` d'abord** : il fait peut-être déjà un fuzzy-match suffisant avant de conclure qu'un ajout au `CATEGORIES` est nécessaire.
- [x] Ajouter des `ConceptDefinition` pour les nouveaux concepts fiscaux/paie/ESG qui n'ont pas encore de `canonicalKey` officiel : TPS, TVQ/TVH, RRQ, RQAP, CNESST, FSS, score ESG, DPA — même si un alias manuel existe déjà, les décrire ici les rend visibles/réutilisables pour d'autres écrans (KPI, audit) qui interrogent potentiellement ce registre à l'avenir.
- [x] Enrichir `CATEGORIES` avec les nouvelles valeurs métier du fichier : provinces (`QC`, `ON`, `NB`...), statut syndical (`Syndiqué`/`Non syndiqué`), classes DPA (`Classe 1`, `Classe 8`...), type de client (`Particulier (B2C)` → `particulier`, `Institutionnel/Gouvernemental (B2B/B2G)` → à mapper sur l'enum `Customer.customer_type` existant `particulier/entreprise/b2b`), canaux de vente (`Magasin Lévis` → `magasin`, `Web Shopify/ERP` → `web`/`shopify`) — **vérifier `coerceEnum()` dans `importUtils.ts` d'abord** : il fait peut-être déjà un fuzzy-match suffisant avant de conclure qu'un ajout au `CATEGORIES` est nécessaire.

## Autres endroits à vérifier/enrichir (audit rapide, à creuser en Phase 1)

- [ ] `src/lib/core/semanticTypes.js` (`SEMANTIC_TYPES`) — mentionné dans le commentaire en tête de `conceptRegistry.ts` comme "catalogue riche" parallèle, utilisé pour la compatibilité d'affichage/agrégation des KPI côté frontend. À vérifier s'il a besoin des mêmes nouveaux `canonicalKey` (TPS, TVQ, RRQ, ESG, DPA...) que `kpiRegistry.js` va consommer.
- [ ] `src/lib/dataAudit.js` — page "Contrôler la qualité" : vérifie si elle référence en dur une liste de champs/entités qui devra inclure `Asset` et les nouveaux champs pour que le contrôle qualité les couvre aussi (sinon les nouvelles données échappent à l'audit).
- [ ] `HEADER_SIGNATURES` (`importUtils.ts` ~ligne 1969+) — la détection de feuille par signature de colonnes obligatoires. Ajouter une signature pour `Asset` (Phase 2) une fois son schéma créé, sinon la feuille "Registre_Immobilisations" ne sera jamais auto-détectée.
- [x] `HEADER_SIGNATURES` (`importUtils.ts` ~ligne 1969+) — la détection de feuille par signature de colonnes obligatoires. Ajouter une signature pour `Asset` (Phase 2) une fois son schéma créé, sinon la feuille "Registre_Immobilisations" ne sera jamais auto-détectée.
- [ ] `src/components/settings/` (paramètres entreprise) — vérifier si un écran de configuration liste en dur les entités/champs disponibles (pourrait avoir besoin d'inclure Asset).

## Fichiers clés à connaître

| Fichier | Rôle |
|---|---|
| `base44/shared/importUtils.ts` | Alias, détection de feuille, `normalizeKeys`, `normalizeRow`, rescue hooks par entité |
| `base44/shared/entitySchemas.ts` | Schéma canonique de chaque entité (source de vérité pour l'import) |
| `base44/entities/*.jsonc` | Schéma déclaratif (doit rester synchronisé avec le fichier ci-dessus) |
| `src/lib/core/kpiRegistry.js` | Registre des KPI avec `dependencies` (gating automatique selon données dispo) |
| `src/lib/domainScores.js` | Scores de domaine (Ventes/Clients/Opérations/etc.) affichés sur KPI/Dashboard |
| `src/lib/metrics.js` | Fonctions partagées (`columnPresent`, `churnStats`, `validSalesOrders`...) |
| `src/pages/*.jsx` | Une page par module, patron d'affichage conditionnel à suivre partout |
| `base44/shared/registry/conceptRegistry.ts` | Dictionnaire sémantique riche (`CONCEPTS`, `CATEGORIES`) — voir section dédiée ci-dessus |
| `src/lib/core/semanticTypes.js` | Catalogue parallèle pour l'affichage/agrégation KPI côté frontend — à vérifier/synchroniser |
| `src/lib/dataAudit.js` | Page "Contrôler la qualité" — vérifier couverture des nouveaux champs/entités |

## Comment reprendre

1. Lire ce fichier en entier + `guide_complet_des_kpis_et_analyses_avanc_es.md`
2. Regarder les cases cochées `[x]` ci-dessus pour savoir où on en est
3. Continuer phase par phase, dans l'ordre, en respectant les 10 règles de travail
4. Mettre à jour ce fichier (cocher les cases, ajouter des notes si une règle supplémentaire est découverte) à chaque étape terminée
