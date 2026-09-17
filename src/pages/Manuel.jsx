import React, { useState } from "react";
import { ChevronDown, Lightbulb, Upload, LayoutDashboard, BarChart3, AlertTriangle, ShieldAlert, Radar as RadarIcon, CheckSquare, Bell, FileText, MessageSquare, Settings, Sparkles, Rocket, Brain, TrendingUp, Calculator, Target, History, Users, Package, Megaphone, Wallet, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import ManualTableOfContents from "@/components/ManualTableOfContents";
import BrandLogo from "@/components/BrandLogo";

const groups = [
  {
    label: "Démarrage",
    sections: [
      {
        id: "demarrage",
        title: "Démarrage rapide",
        icon: Rocket,
        content: [
          { h: "Bienvenue dans GESCOP", p: "GESCOP est un système intelligent tout-en-un pour le pilotage, l'anticipation et l'aide à la décision stratégique destiné aux PME. Il centralise vos données financières et opérationnelles, détecte automatiquement les signaux faibles, et produit des recommandations actionnables." },
          { h: "Première utilisation", p: "Au premier accès, l'assistant d'onboarding vous guide en trois étapes : identité de l'entreprise, activité & clientèle, puis objectifs stratégiques. Vous pouvez renseigner l'URL de votre site web et cliquer sur « Auto-remplir » pour pré-remplir automatiquement les champs à partir des informations publiques." },
          { h: "Le flux de travail recommandé", p: "1. Configurez votre entreprise (onboarding) → 2. Importez vos données (transactions, clients, produits, commandes, etc.) → 3. Lancez l'analyse IA depuis le tableau de bord → 4. Consultez les anomalies, risques et recommandations → 5. Convertissez les recommandations en tâches → 6. Générez un rapport." },
          { h: "Données et modules", p: "Chaque module de GESCOP s'appuie sur des données spécifiques que vous importez. Le tableau ci-dessous détaille, pour chaque module, quelles données le nourrissent et ce qu'il produit. Importez les données correspondantes pour activer un module - un module sans données reste vide jusqu'à l'import." },
        ],
      },
      {
        id: "onboarding",
        title: "Configuration de l'entreprise",
        icon: Sparkles,
        content: [
          { h: "Étape 1 - Identité", p: "Renseignez le nom, le secteur, la localisation, le nombre d'employés et le chiffre d'affaires. Le champ « Site web » permet l'enrichissement automatique : entrez l'URL puis cliquez sur « Auto-remplir » pour extraire les informations publiques de votre entreprise via IA." },
          { h: "Étape 2 - Activité & clientèle", p: "Décrivez votre modèle d'affaires, vos produits, services et clientèle. Sélectionnez les outils que vous utilisez déjà (Excel, QuickBooks, Shopify, etc.) en cliquant sur les tuiles correspondantes." },
          { h: "Étape 3 - Objectifs", p: "Choisissez vos objectifs stratégiques. Ces objectifs orientent les recommandations produites par le moteur d'analyse IA - plus ils sont précis, plus les recommandations sont pertinentes." },
          { h: "Données produites", p: "L'onboarding alimente l'entité Company (profil d'entreprise) qui sert de contexte à toutes les analyses IA, à l'assistant, et au radar externe. Sans onboarding, l'analyse IA ne peut pas démarrer." },
        ],
      },
      {
        id: "import",
        title: "Import universel de données (Moteur V3)",
        icon: Upload,
        content: [
          { h: "Formats supportés & Moteur Universel V3", p: "GESCOP accepte les fichiers CSV, Excel (.xlsx, .xls), TSV et PDF texte. Grâce au Moteur Universel V3, l'application analyse la structure, le grain des données (transactionnel fin, composite ou agrégé par succursale), et rattache automatiquement chaque colonne au concept commercial approprié." },
          { h: "Reconnaissance sémantique & Tolérance", p: "Le moteur comprend plus de 7 langues (français québécois, anglais, espagnol, allemand, italien, etc.), gère la tokenisation (camelCase, snake_case, espaces), tolère les fautes de frappe courantes et élimine automatiquement les lignes de « TOTAL » ou « Sommaire » pour ne conserver que la donnée utile." },
          { h: "Rattrapage contextuel & Mémoire", p: "Si une colonne utilise un terme propre à votre organisation (ex. « Succursale », « Coût Total ($) », « % Marge »), GESCOP utilise le profil d'entreprise et le Dictionnaire d'Entreprise pour la rattacher automatiquement (ex. Succursale ≠ Département, Profit brut $ ≠ Marge brute %)." },
          { h: "Types de données importables", p: "Vous pouvez importer simultanément plusieurs fichiers pour alimenter les différentes tables de l'app. Chaque type de données alimente un ou plusieurs modules spécifiques :" },
          { h: "Transactions (income/expense)", p: "Fichier avec colonnes : date, description, montant, type (income/expense), catégorie. Alimente : Tableau de bord, KPI (domaine Finance), Trésorerie, Anomalies, Prévisions, Assistant IA." },
          { h: "Commandes (Orders)", p: "Fichier avec colonnes : order_id, customer_id, date, channel, product_id, quantity, unit_price, total, payment_status, fulfillment_status. Alimente : KPI (domaine Ventes), Clients (LTV, panier moyen), Produits (ventes mensuelles)." },
          { h: "Clients (Customers)", p: "Fichier avec colonnes : customer_id, name, email, segment, status, acquisition_date, total_spent. Alimente : page Clients (segmentation, churn, LTV), KPI (domaine Clients)." },
          { h: "Produits (Products)", p: "Fichier avec colonnes : product_id, product_name, category, purchase_cost, selling_price, gross_margin, monthly_sales, inventory_level, reorder_point, status. Alimente : page Produits, KPI (domaine Opérations)." },
          { h: "Stocks (Inventory)", p: "Fichier avec colonnes : date, product_id, opening_stock, units_sold, closing_stock, stock_status. Alimente : page Produits (alertes rupture, stock dormant), KPI (domaine Opérations)." },
          { h: "Campagnes (Campaigns)", p: "Fichier avec colonnes : campaign_id, campaign_name, channel, budget, spend, impressions, clicks, conversions, revenue, status. Alimente : page Marketing, KPI (domaine Marketing)." },
          { h: "Flux de trésorerie (Cashflow)", p: "Fichier avec colonnes : date, opening_cash, cash_in, cash_out, closing_cash, accounts_receivable, accounts_payable. Alimente : page Trésorerie, KPI (Trésorerie actuelle). GESCOP distingue rigoureusement les 4 flux (ouverture, entrées, sorties, clôture)." },
          { h: "Dépenses (Expenses)", p: "Fichier avec colonnes : date, category, supplier, amount, recurring, department. Alimente : page Trésorerie (dépenses récurrentes), analyse IA." },
          { h: "Employés & Paie (Employees, Payroll)", p: "Fichiers avec colonnes : employee_id, department, hourly_rate, weekly_hours / payroll_id, period, regular_pay, overtime. Alimente : page Trésorerie (coûts salariaux), analyse IA." },
          { h: "Fournisseurs (Suppliers)", p: "Fichier avec colonnes : supplier_id, supplier_name, category, average_delivery_days, quality_score, reliability_score. Alimente : analyse IA (risques fournisseurs), radar externe." },
          { h: "Concurrents (Competitors)", p: "Fichier avec colonnes : competitor_id, name, sector, market_position, price_position, estimated_revenue. Alimente : page Paramètres (suivi concurrents), radar externe." },
          { h: "Campagnes journalières (CampaignDaily)", p: "Fichier avec colonnes : date, campaign_id, impressions, clicks, spend, revenue, roas. Alimente : page Marketing (analyse temporelle fine par campagne)." },
          { h: "Interactions client (Interaction)", p: "Fichier avec colonnes : interaction_id, date, customer_id, channel, type, sentiment, satisfaction_score. Alimente : analyse IA (satisfaction client, plaintes), radar externe." },
          { h: "Achats (Purchase)", p: "Fichier avec colonnes : purchase_id, date, supplier_id, product_id, quantity, unit_cost, total_cost, status. Alimente : analyse IA (risques fournisseurs, retards de livraison)." },
          { h: "Signaux externes (ExternalSignal)", p: "Fichier avec colonnes : title, family, impact, source, url, date, relevance_score. Alimente : page Radar externe. Note : ces signaux sont normalement générés par l'IA, mais peuvent aussi être importés manuellement." },
          { h: "Objectifs (Goal)", p: "Fichier avec colonnes : goal_id, domain, metric, target, current, period, priority, status. Alimente : suivi des objectifs stratégiques, comparaison cible vs réel." },
          { h: "Événements (Event)", p: "Fichier avec colonnes : event_id, date, event_type, description, impact_area. Alimente : analyse IA (contexte des événements internes ayant un impact sur les performances)." },
          { h: "Qualité & Audit de données", p: "Après l'import, un score de qualité sur 100 est calculé. Les lignes douteuses sont isolées en quarantaine avec motif explicite. L'historique complet et la traçabilité restent consultables à tout moment." },
        ],
      },
      {
        id: "sources",
        title: "Où trouver vos données",
        icon: FileText,
        content: [
          { h: "Transactions (revenus/dépenses)", p: "Exportez depuis votre logiciel comptable : QuickBooks, Sage, Xero, Wave, FreshBooks ou votre banque (export CSV des relevés). Colonnes typiques : date, description, montant, type. La plupart des banques canadiennes (RBC, TD, Scotia, BMO, Desjardins) offrent un export CSV des transactions depuis leur portail en ligne." },
          { h: "Commandes (Orders)", p: "Exportez depuis votre plateforme e-commerce : Shopify (Admin → Orders → Export), WooCommerce, BigCommerce, Wix Stores, ou votre système de caisse (POS). Colonnes typiques : order_id, date, customer_id, product_id, quantity, total, payment_status." },
          { h: "Clients (Customers)", p: "Exportez depuis votre CRM ou plateforme e-commerce : Shopify (Customers → Export), HubSpot, Salesforce, Zoho CRM, ou votre fichier Excel de gestion client. Colonnes typiques : customer_id, name, email, segment, status, total_spent, acquisition_date." },
          { h: "Produits (Products)", p: "Exportez depuis votre plateforme e-commerce ou votre système de gestion des stocks : Shopify (Products → Export), WooCommerce, Lightspeed, ou votre fichier Excel de catalogue. Colonnes typiques : product_id, product_name, category, purchase_cost, selling_price, gross_margin, status." },
          { h: "Stocks (Inventory)", p: "Exportez depuis votre système de gestion des stocks : Shopify Inventory, Lightspeed, Stocky, ou votre fichier Excel d'inventaire mensuel. Colonnes typiques : date, product_id, opening_stock, units_sold, closing_stock, stock_status." },
          { h: "Campagnes (Campaigns)", p: "Exportez depuis vos plateformes publicitaires : Google Ads (Campagnes → Rapports → Télécharger), Meta Ads Manager (Exporter), TikTok Ads, ou votre outil d'email (Mailchimp, Klaviyo). Colonnes typiques : campaign_id, campaign_name, channel, spend, impressions, clicks, conversions, revenue." },
          { h: "Flux de trésorerie (Cashflow)", p: "Construisez ce fichier à partir de votre relevé bancaire (export CSV) ou de votre logiciel comptable (QuickBooks, Xero → Rapport de flux de trésorerie → Export). Colonnes typiques : date, opening_cash, cash_in, cash_out, closing_cash, accounts_receivable, accounts_payable." },
          { h: "Dépenses (Expenses)", p: "Exportez depuis votre logiciel comptable : QuickBooks (Expenses → Export), Xero, FreshBooks, ou votre fichier Excel de suivi des dépenses. Colonnes typiques : date, category, supplier, amount, recurring, department." },
          { h: "Employés & Paie (Employees, Payroll)", p: "Exportez depuis votre système de paie : ADP, Ceridian/Dayforce, Payworks, QuickBooks Payroll, ou votre fichier Excel RH. Employees : employee_id, department, hourly_rate, weekly_hours, status. Payroll : payroll_id, employee_id, period, regular_pay, overtime, total_cost." },
          { h: "Fournisseurs (Suppliers)", p: "Exportez depuis votre logiciel comptable (QuickBooks → Vendors → Export) ou votre fichier Excel de gestion des achats. Colonnes typiques : supplier_id, supplier_name, category, average_delivery_days, quality_score, reliability_score." },
          { h: "Concurrents (Competitors)", p: "Saisissez manuellement ou exportez depuis un outil d'intelligence commerciale (Crunchbase, Owler, SEMrush). Colonnes typiques : competitor_id, name, sector, market_position, price_position, estimated_revenue, average_rating." },
          { h: "Campagnes journalières (CampaignDaily)", p: "Exportez depuis vos plateformes publicitaires (Google Ads, Meta Ads) au niveau du rapport journalier par campagne. Colonnes typiques : date, campaign_id, impressions, clicks, spend, revenue." },
          { h: "Interactions client (Interaction)", p: "Exportez depuis votre système de service client (Zendesk, Intercom, Gorgias) ou votre CRM. Colonnes typiques : interaction_id, date, customer_id, channel, type, sentiment, satisfaction_score." },
          { h: "Achats (Purchase)", p: "Exportez depuis votre logiciel comptable (QuickBooks → Purchases/Vendors) ou votre système d'approvisionnement. Colonnes typiques : purchase_id, date, supplier_id, product_id, quantity, unit_cost, total_cost, status." },
          { h: "Signaux externes (ExternalSignal)", p: "Normalement générés par l'IA. Pour un import manuel, créez un fichier avec les signaux marché pertinents : title, family, impact, source, url, date, relevance_score." },
          { h: "Objectifs (Goal)", p: "Créez manuellement un fichier avec vos objectifs stratégiques : goal_id, domain, metric, target, current, period, priority, status. Exportez aussi depuis votre outil de gestion OKR/KPI." },
          { h: "Événements (Event)", p: "Créez manuellement un fichier retraçant les événements internes ayant un impact sur l'activité : event_id, date, event_type, description, impact_area." },
          { h: "Format des fichiers", p: "Tous les fichiers peuvent être en CSV, Excel (.xlsx, .xls) ou TSV. Exportez simplement le fichier depuis votre outil, ou créez un tableur avec les colonnes indiquées. Les en-têtes en français ou en anglais sont acceptés. Le système reconnaît automatiquement le type de données à partir du nom du fichier et de ses colonnes." },
          { h: "Vous n'avez pas tout ?", p: "GESCOP fonctionne même avec des données partielles. Importez d'abord vos transactions (le minimum requis), puis ajoutez progressivement les autres fichiers. Les modules sans données restent vides jusqu'à l'import correspondant." },
        ],
      },
    ],
  },
  {
    label: "Pilotage quotidien",
    sections: [
      {
        id: "dashboard",
        title: "Tableau de bord",
        icon: LayoutDashboard,
        content: [
          { h: "Vue d'ensemble", p: "Le tableau de bord est la page d'accueil. Il présente le score de santé global de l'entreprise (jauge), les statistiques financières clés, et les scores par dimension (finance, ventes, opérations, marketing)." },
          { h: "Données utilisées", p: "Le tableau de bord agrège les données de toutes les entités importées : Transactions, Orders, Customers, Campaigns, Products, Inventory, Cashflow, ainsi que les résultats de la dernière analyse IA (Anomaly, Risk, Opportunity, Recommendation, Kpi, AnalysisRun). Sans données importées, le tableau de bord affiche l'écran d'onboarding." },
          { h: "Lancer l'analyse IA", p: "Le bouton « Analyser » déclenche le moteur d'analyse qui examine l'ensemble de vos données, détecte les anomalies, évalue les risques, identifie les opportunités, calcule les KPI et génère des recommandations. Cette opération peut prendre quelques secondes." },
          { h: "Sections affichées", p: "Après analyse, le tableau de bord affiche : les priorités critiques du jour, le score de santé et les scores par dimension, les KPI clés, les anomalies détectées (triées par sévérité), les risques actifs, les prévisions, et les recommandations prioritaires. Chaque section renvoie vers sa page dédiée pour le détail." },
        ],
      },
      {
        id: "kpis",
        title: "Moteur Universel de Découverte des KPI",
        icon: BarChart3,
        content: [
          { h: "Découverte dynamique des indicateurs", p: "GESCOP ne force pas une liste rigide : son Moteur de Découverte inspecte vos données réelles, identifie automatiquement tous les KPI éligibles, vérifie leur faisabilité mathématique et publie instantanément les indicateurs calculables." },
          { h: "10 Catalogues de Domaines", p: "Le moteur structure les indicateurs en 10 domaines : Finance (marge brute, EBITDA), Ventes (panier moyen, taux de conversion), Trésorerie (cash runway, burn rate), Clients (LTV, churn rate), Opérations (rotation de stock), Marketing (ROAS, CAC, CTR), RH (masse salariale / revenu), Risques, Prévisions et Stratégie." },
          { h: "Diagnostic de cause racine des métriques manquantes", p: "Si un indicateur stratégique ne peut être calculé, GESCOP détaille la cause exacte (ex: 'Requis: COGS') et suggère le type de fichier à importer pour débloquer automatiquement ce KPI." },
          { h: "Sécurité mathématique & Blindage", p: "Chaque formule est protégée contre la division par zéro, les dénominateurs nuls et les incohérences d'échelle. Les valeurs font l'objet d'un audit de plausibilité avant publication." },
          { h: "Graphique de tendance & Épinglage", p: "Suivez l'évolution mensuelle sur 8 à 12 mois et épinglez vos KPI prioritaires directement sur votre tableau de bord via le centre de configuration." },
        ],
      },
      {
        id: "tresorerie",
        title: "Trésorerie",
        icon: Wallet,
        content: [
          { h: "Données utilisées", p: "Ce module s'appuie sur trois sources importées : Cashflow (flux de trésorerie journaliers), Expenses (dépenses et abonnements récurrents), et Payroll (coûts salariaux par période). Sans ces données, la page affiche un état vide." },
          { h: "Flux de trésorerie", p: "À partir des enregistrements Cashflow, le module trace l'évolution de votre liquidité : encaissements (cash_in), décaissements (cash_out), solde net et solde de clôture (closing_cash) jour par jour. Visualisez la trajectoire pour anticiper les tensions." },
          { h: "Créances et dettes", p: "Les champs accounts_receivable (créances clients) et accounts_payable (dettes fournisseurs) du fichier Cashflow sont agrégés pour montrer votre position nette à court terme." },
          { h: "Dépenses récurrentes", p: "Le fichier Expenses alimente la section des abonnements et coûts fixes : les dépenses marquées recurring=true sont listées avec leur montant mensuel total, pour visualiser vos engagements fixes." },
          { h: "Coûts salariaux", p: "Le fichier Payroll alimente le graphique des coûts de personnel par période (total_cost), pour suivre l'évolution de votre masse salariale et son impact sur la trésorerie." },
          { h: "Ce que le module fait", p: "Il calcule et affiche : le solde de trésorerie actuel, le flux net moyen, le total des dépenses récurrentes mensuelles, le total des coûts salariaux, et les graphiques d'évolution temporelle (flux de trésorerie, entrées vs sorties, tendance salariale)." },
        ],
      },
      {
        id: "clients",
        title: "Clients",
        icon: Users,
        content: [
          { h: "Données utilisées", p: "Ce module s'appuie sur les entités Customers (fichier clients) et Orders (fichier commandes). Les commandes sont rattachées aux clients via customer_id pour calculer la valeur vie et le panier moyen. Sans clients importés, la page affiche un état vide." },
          { h: "Portefeuille client", p: "À partir du fichier Customers, le module présente : nombre total de clients, clients actifs, clients inactifs/perdus, et le taux de churn. Chaque client affiche son chiffre d'affaires cumulé (total_spent), sa valeur vie (LTV) et sa date d'acquisition." },
          { h: "Segmentation automatique", p: "Le champ segment du fichier Customers est utilisé pour répartir vos clients : nouveau, régulier, VIP, B2B, haute valeur, à risque. Un graphique camembert montre la répartition par segment." },
          { h: "Concentration de revenus", p: "Le module croise Customers et Orders pour identifier la concentration de revenus : quels clients représentent la plus grande part de votre chiffre d'affaires, et quel est le risque de dépendance." },
          { h: "Ce que le module fait", p: "Il calcule et affiche : le nombre de clients par segment, le taux de churn, la LTV moyenne, le panier moyen par client, un graphique de répartition par segment, un graphique des revenus par client, et un tableau des top clients." },
        ],
      },
      {
        id: "produits",
        title: "Produits",
        icon: Package,
        content: [
          { h: "Données utilisées", p: "Ce module s'appuie sur les entités Products (fichier catalogue produits) et Inventory (fichier mouvements de stock). Les deux sont reliés via product_id. Sans produits importés, la page affiche un état vide." },
          { h: "Catalogue de produits", p: "À partir du fichier Products, le module affiche : nombre total de produits, marge brute moyenne, ventes mensuelles totales, et le statut de chaque produit (actif, discontinué, rupture, nouveau)." },
          { h: "Gestion des stocks", p: "Le fichier Inventory alimente les alertes de stock : produits en rupture, proches de la rupture, en surstock ou dormants. Le champ stock_status est utilisé pour classer chaque produit. Un graphique camembert montre la répartition des statuts de stock." },
          { h: "Marge et rentabilité", p: "Le module compare le coût d'achat (purchase_cost) et le prix de vente (selling_price) de chaque produit pour calculer la marge brute (gross_margin). Les produits à marge faible ou négative sont signalés pour révision tarifaire ou renégociation fournisseur." },
          { h: "Ce que le module fait", p: "Il calcule et affiche : le nombre de produits, la marge moyenne, le nombre de produits dormants, les alertes de rupture, un graphique des ventes par produit, un graphique de répartition des stocks, et un tableau des produits les plus performants." },
        ],
      },
      {
        id: "marketing",
        title: "Marketing",
        icon: Megaphone,
        content: [
          { h: "Données utilisées", p: "Ce module s'appuie sur l'entité Campaigns (fichier campagnes publicitaires). Optionnellement, CampaignDaily (données journalières par campagne) peut affiner l'analyse temporelle. Sans campagnes importées, la page affiche un état vide." },
          { h: "Performance des campagnes", p: "À partir du fichier Campaigns, le module synthétise pour chaque campagne : budget, dépenses (spend), impressions, clics, conversions, chiffre d'affaires généré (revenue), nouveaux clients, CAC et ROAS. Les canaux supportés : Google Ads, Meta Ads, Instagram, email, TikTok." },
          { h: "Indicateurs calculés", p: "Le module calcule à partir des totaux : ROAS moyen (revenue / spend), CAC moyen (spend / conversions), taux de clic (CTR = clicks / impressions), taux de conversion (conversions / clicks). Ces indicateurs sont agrégés par canal et dans le temps." },
          { h: "Ce que le module fait", p: "Il affiche : les KPI marketing globaux (ROAS, CAC, CTR, taux de conversion), un graphique en barres de la performance par canal, un graphique linéaire de l'évolution du ROAS dans le temps, et un tableau détaillé triable de toutes les campagnes." },
          { h: "Recommandations", p: "Les campagnes sous le seuil de rentabilité (ROAS < 1) ou avec un CAC élevé sont visibles dans le tableau pour ajustement ou suspension." },
        ],
      },
    ],
  },
  {
    label: "Intelligence & analyse",
    sections: [
      {
        id: "anomalies",
        title: "Anomalies",
        icon: AlertTriangle,
        content: [
          { h: "Données utilisées", p: "Les anomalies sont générées par le moteur d'analyse IA à partir de l'ensemble de vos données importées (Transactions, Orders, Cashflow, Inventory, Campaigns, etc.). Elles sont stockées dans l'entité Anomaly. Aucune anomalie n'existe tant que vous n'avez pas lancé l'analyse IA." },
          { h: "Détection automatique", p: "Le moteur d'analyse examine vos données et détecte les écarts anormaux : variation inhabituelle de revenus, dépense exceptionnelle, chute de marge, rupture de stock inattendue, baisse de performance marketing, etc. Chaque anomalie est classée par sévérité (critique, important, modéré, faible)." },
          { h: "Explications", p: "Chaque anomalie inclut une explication contextuelle (champ explanation) qui décrit la nature de l'écart et son ampleur (deviation_pct en pourcentage). Cela vous aide à comprendre rapidement ce qui s'est passé." },
          { h: "Résolution", p: "Marquez une anomalie comme « résolue » une fois que vous l'avez traitée. Les anomalies résolues restent consultables dans la section inférieure pour référence." },
          { h: "Notifications automatiques", p: "Lorsqu'une anomalie critique est détectée, GESCOP vous envoie automatiquement un email et crée une alerte dans l'application pour vous prévenir immédiatement." },
        ],
      },
      {
        id: "risques",
        title: "Risques & opportunités",
        icon: ShieldAlert,
        content: [
          { h: "Données utilisées", p: "Les risques et opportunités sont générés par le moteur d'analyse IA à partir de l'ensemble de vos données importées et du profil d'entreprise (Company). Ils sont stockés dans les entités Risk et Opportunity. Aucun risque ni opportunité n'existe tant que vous n'avez pas lancé l'analyse." },
          { h: "Risques", p: "Les risques sont évalués selon leur probabilité, leur impact (faible/moyen/élevé), leur urgence et leur confiance. Un score global permet de prioriser. Chaque risque inclut une description, une catégorie, un impact financier estimé et un horizon temporel." },
          { h: "Opportunités", p: "Les opportunités représentent des leviers de croissance identifiés par l'IA. Elles sont classées par potentiel (faible, moyen, élevé), probabilité de réussite, impact financier et niveau de confiance." },
          { h: "Notifications automatiques", p: "Lorsqu'un risque à urgence élevée est détecté, GESCOP vous envoie automatiquement un email et crée une alerte dans l'application pour vous prévenir immédiatement." },
          { h: "Conversion en tâches", p: "Pour chaque risque ou opportunité, vous pouvez créer une tâche d'action directement. Le statut du risque ou de l'opportunité est alors mis à jour pour suivre le traitement." },
        ],
      },
      {
        id: "recommandations",
        title: "Recommandations",
        icon: Lightbulb,
        content: [
          { h: "Données utilisées", p: "Les recommandations sont générées par le moteur d'analyse IA à partir des risques, opportunités et anomalies détectés. Elles sont stockées dans l'entité Recommendation. Aucune recommandation n'existe tant que vous n'avez pas lancé l'analyse." },
          { h: "Recommandations IA", p: "Chaque recommandation décrit la situation, l'analyse, l'impact attendu et l'action recommandée, avec une priorité (faible à urgente) et un impact financier estimé." },
          { h: "Accepter ou rejeter", p: "Vous pouvez accepter une recommandation (ce qui la convertit en tâche actionnable) ou la rejeter. Les recommandations traitées restent consultables dans la section inférieure." },
          { h: "Conversion en tâche", p: "L'acceptation d'une recommandation crée automatiquement une tâche avec sa catégorie et sa priorité, prête à être suivie dans la section Tâches." },
        ],
      },
      {
        id: "insights",
        title: "Insights",
        icon: Brain,
        content: [
          { h: "Données utilisées", p: "La page Insights agrège les signaux détectés par l'IA depuis quatre entités : Anomaly, Risk, Opportunity et Recommendation. Aucun insight n'est disponible tant que vous n'avez pas lancé l'analyse IA." },
          { h: "Insights structurés", p: "Tous les signaux sont présentés dans un format uniforme : Quoi (le fait), Pourquoi (l'explication), Impact (estimation financière), et Action (ce qu'il faut faire). Chaque insight inclut un niveau de confiance et un impact financier estimé." },
          { h: "Filtrage", p: "Filtrez les insights par type (anomalie, risque, opportunité, recommandation) et par priorité. Triez par impact financier ou par confiance pour identifier rapidement les actions les plus importantes." },
          { h: "Actionnabilité", p: "Chaque insight est conçu pour être directement actionnable : l'action recommandée est spécifique et immédiate, pas théorique. L'impact financier estimé vous aide à prioriser." },
        ],
      },
      {
        id: "radar",
        title: "Radar Stratégique (12 Domaines & Cross-Signal)",
        icon: RadarIcon,
        content: [
          { h: "Architecture des 12 Domaines", p: "Le Radar GESCOP surveille l'environnement global de votre PME à travers 12 domaines : 1. Concurrence, 2. Marché & Demande, 3. Clients & Comportements, 4. Prix & Offres, 5. Produits & Services, 6. Marketing & Communication, 7. Technologie & Innovation, 8. Économie & Finance externe, 9. Réglementation & Juridique, 10. Territoire & Économie locale, 11. Chaîne d'approvisionnement, 12. RH & Emploi." },
          { h: "Moteur Cross-Signal & Typage Strict", p: "Pour garantir une rigueur absolue, le moteur classe chaque information selon 3 statuts : [FAIT] (information vérifiée et objective), [INFÉRENCE] (déduction logique reliant un fait externe aux indicateurs internes de votre entreprise), et [HYPOTHÈSE] (scénario d'anticipation ou signal faible nécessitant vigilance)." },
          { h: "Les 5 Questions Fondamentales", p: "À chaque actualisation, le Radar répond aux 5 questions clés du dirigeant : 1. Qu'est-ce qui a changé dans l'environnement ? 2. Qu'est-ce qui bouge chez les concurrents ? 3. Qu'est-ce qui influence les clients ? 4. Quels risques ou opportunités émergent ? 5. Quelle action l'entreprise doit-elle engager immédiatement ?" },
          { h: "Adaptation sectorielle automatique", p: "Selon le profil renseigné dans Paramètres, GESCOP pondère les domaines critiques de votre activité (ex. Commerce de détail et plein air = Concurrence, Prix, Marché, Approvisionnement)." },
          { h: "Recommandations et Actions immédiates", p: "Chaque signal critique propose une action immédiate directement convertible en tâche stratégique." },
        ],
      },
      {
        id: "previsions",
        title: "Prévisions",
        icon: TrendingUp,
        content: [
          { h: "Données utilisées", p: "Les prévisions sont générées par le moteur d'analyse IA à partir de l'historique de vos Transactions (revenus et dépenses) et de votre Cashflow (solde de trésorerie). Plus l'historique importé est long, plus les prévisions sont fiables." },
          { h: "Trois axes de prévision", p: "GESCOP projette trois indicateurs clés sur 30, 60 et 90 jours : le chiffre d'affaires, la marge, et la trésorerie. Les prévisions sont basées sur les tendances de vos données historiques." },
          { h: "Visualisation", p: "Chaque prévision est accompagnée d'un graphique montrant la trajectoire projetée. Les intervalles de confiance et la probabilité vous indiquent la marge d'incertitude autour de chaque projection." },
          { h: "Anticipation", p: "Utilisez les prévisions pour anticiper les besoins de trésorerie, identifier les mois à risque, et planifier les investissements au bon moment." },
        ],
      },
      {
        id: "historique",
        title: "Historique des analyses",
        icon: History,
        content: [
          { h: "Données utilisées", p: "L'historique s'appuie sur l'entité AnalysisRun qui enregistre chaque exécution du moteur d'analyse IA avec son score de santé, ses scores par dimension, et ses compteurs (anomalies, risques, opportunités, recommandations)." },
          { h: "Mémoire d'analyse", p: "Chaque analyse IA est enregistrée avec son horodatage, son score de santé global, ses scores par dimension (finance, ventes, opérations, marketing), et le nombre de signaux détectés. Cette mémoire vous permet de suivre l'évolution de votre entreprise dans le temps." },
          { h: "Évolution du score", p: "Un graphique montre l'évolution de votre score de santé global sur toutes les analyses passées. Identifiez les tendances : amélioration continue, stagnation, ou dégradation." },
          { h: "Comparaison temporelle", p: "La section « Qu'est-ce qui a changé ? » compare automatiquement les deux dernières analyses et liste les améliorations et dégradations par dimension." },
        ],
      },
    ],
  },
  {
    label: "Action & outils",
    sections: [
      {
        id: "simulateur",
        title: "Simulateur de décisions",
        icon: Calculator,
        content: [
          { h: "Données utilisées", p: "Le simulateur s'appuie sur vos données réelles importées (Transactions, Orders, Products) comme point de référence pour les scénarios. Il utilise les totaux actuels (revenu, marge, coûts) comme valeurs de base ajustables." },
          { h: "Simulation « Et si ? »", p: "Le simulateur vous permet de tester l'impact financier d'une décision avant de la prendre. Ajustez les curseurs (prix, volume, coûts, délais) et voyez instantanément l'effet sur le chiffre d'affaires, la marge et la trésorerie." },
          { h: "Scénarios", p: "Testez plusieurs scénarios : augmentation de prix, réduction de coûts, investissement marketing, embauche. Comparez les résultats pour choisir la meilleure option." },
          { h: "Conversion en décision", p: "Une fois satisfait d'un scénario, convertissez-le en décision suivie dans la page Décisions pour comparer la prévision au résultat réel." },
        ],
      },
      {
        id: "decisions",
        title: "Décisions & apprentissage",
        icon: Target,
        content: [
          { h: "Données utilisées", p: "La page Décisions s'appuie sur l'entité Decision qui enregistre le cycle complet de vos décisions : impact prévu, impact réel, statut. Les décisions peuvent être créées manuellement ou à partir du simulateur." },
          { h: "Mémoire décisionnelle", p: "La page suit le cycle complet : À décider → Décisions prises → Résultats. Chaque décision enregistre son impact prévu, puis son impact réel une fois le résultat connu." },
          { h: "Comparaison prévision/réalité", p: "Lorsque vous ajoutez les résultats réels d'une décision, GESCOP calcule automatiquement la performance (pourcentage de l'impact prévu réellement atteint). Vous voyez d'un coup d'œil si vos décisions ont eu l'effet espéré." },
          { h: "Apprentissage", p: "Les statistiques de précision (précision moyenne, nombre de décisions suivies, prévisions trop optimistes) vous aident à calibrer vos futures prévisions. GESCOP apprend de vos écarts pour améliorer la qualité de ses recommandations." },
        ],
      },
      {
        id: "taches",
        title: "Tâches",
        icon: CheckSquare,
        content: [
          { h: "Données utilisées", p: "La section Tâches s'appuie sur l'entité Task. Les tâches sont créées soit manuellement, soit automatiquement quand vous acceptez une recommandation ou convertissez un risque/opportunité en action." },
          { h: "Suivi des actions", p: "La section centralise toutes les actions issues des recommandations, risques et opportunités que vous avez convertis. Chaque tâche a une catégorie, une priorité, une échéance et un responsable." },
          { h: "Statuts", p: "Les tâches passent par quatre statuts : à faire, en cours, terminée, annulée. Mettez à jour le statut au fur et à mesure de votre progression." },
          { h: "Catégories", p: "Les catégories incluent : urgent, financier, commercial, marketing, opérationnel, administratif et stratégique - pour organiser votre plan d'action." },
          { h: "Vue calendrier", p: "Basculez entre la vue liste et la vue calendrier pour visualiser vos échéances dans le temps et planifier votre charge de travail." },
        ],
      },
      {
        id: "alertes",
        title: "Alertes",
        icon: Bell,
        content: [
          { h: "Données utilisées", p: "Les alertes s'appuient sur l'entité Alert. Elles sont générées automatiquement par le moteur d'analyse IA (anomalie critique, risque élevé) ou par le système (échéance de tâche, seuil de trésorerie)." },
          { h: "Centre de notifications", p: "Les alertes vous informent des événements importants détectés par le système. Elles sont classées par niveau (critique, important, modéré, info, faible)." },
          { h: "Notifications par email", p: "Les alertes critiques (anomalie critique ou risque majeur) déclenchent automatiquement l'envoi d'un email à votre adresse pour vous prévenir même hors de l'application." },
          { h: "Lien direct", p: "Chaque alerte peut être liée à un élément spécifique (risque, anomalie, recommandation) - cliquez pour accéder directement à l'élément concerné." },
          { h: "Marquer comme lue", p: "Une fois consultée, marquez l'alerte comme lue pour garder votre centre de notifications propre. Les alertes archivées restent accessibles." },
        ],
      },
      {
        id: "rapports",
        title: "Rapports",
        icon: FileText,
        content: [
          { h: "Données utilisées", p: "Les rapports sont générés par le moteur d'analyse IA en synthétisant l'ensemble de vos données : Company (profil), Transactions, Orders, KPI, Anomaly, Risk, Opportunity, Recommendation, AnalysisRun. Ils sont stockés dans l'entité Report." },
          { h: "Génération de rapports", p: "GESCOP produit trois types de rapports : quotidien, hebdomadaire et mensuel. Chaque rapport synthétise l'état de votre entreprise sur la période concernée : santé globale, anomalies, risques, recommandations et actions." },
          { h: "Contenu", p: "Les rapports sont au format texte enrichi et incluent un résumé exécutif, les indicateurs clés, les points d'attention et les actions prioritaires. Ils sont consultables directement dans l'application." },
          { h: "Historique", p: "Tous les rapports générés sont conservés et consultables dans l'historique. Vous pouvez les supprimer si nécessaire." },
        ],
      },
      {
        id: "assistant",
        title: "Assistant IA",
        icon: MessageSquare,
        content: [
          { h: "Données utilisées", p: "L'Assistant IA a accès à l'ensemble de vos données via le module businessContext : profil d'entreprise (Company), Transactions, Orders, Customers, Products, Inventory, Campaigns, Cashflow, Expenses, KPI, Anomalies, Risks, Opportunities, Recommendations. Plus vous importez de données, plus ses réponses sont précises." },
          { h: "Conversation naturelle", p: "L'Assistant IA répond à vos questions sur votre entreprise en langage naturel. Posez des questions comme « Quelle est ma situation financière ? », « Quels sont mes principaux risques ? » ou « Que dois-je faire en priorité ? »." },
          { h: "Citations des sources", p: "Chaque réponse de l'assistant indique les sources utilisées (données financières, anomalies détectées, KPI, etc.) avec la période et le volume de données. Vous savez toujours sur quelle base l'IA a répondu, ce qui renforce la confiance dans les recommandations." },
          { h: "Conseils d'utilisation", p: "Pour des réponses précises, posez des questions spécifiques. L'assistant peut vous aider à interpréter les données, suggérer des actions, ou expliquer une anomalie détectée." },
        ],
      },
      {
        id: "audit",
        title: "Audit & Intégrité des calculs",
        icon: ShieldCheck,
        content: [
          { h: "Transparence & Single Source of Truth (SSOT)", p: "Le module Audit des calculs offre une vue transparente de l'ensemble de la chaîne de valeur analytique : de la donnée brute importée aux KPI consolidés et aux alertes." },
          { h: "Score de Qualité & Quarantaine", p: "Vérifiez les scores de complétude de chaque fichier, identifiez les anomalies de formats et inspectez les lignes écartées en quarantaine avec le détail de la cause de rejet." },
          { h: "Souveraineté & Conformité Loi 25", p: "GESCOP garantit la traçabilité intégrale, l'hébergement sécurisé au Canada et l'étanchéité absolue de vos données d'entreprise." },
        ],
      },
      {
        id: "parametres",
        title: "Centre de Configuration & Contexte Entreprise (Paramètres)",
        icon: Settings,
        content: [
          { h: "Architecture en 5 Piliers & 13 Sections", p: "Paramètres est le cerveau référentiel de GESCOP. Les données renseignées alimentent l'intelligence sémantique d'import, le moteur KPI, le Radar et les décisions." },
          { h: "1. Contexte Entreprise", p: "Comprend 6 sections : Entreprise (fiche d'identité et carte de connaissance IA), Activité & Modèle (B2B, B2C, abonnements), Organisation & Succursales (distinction nette entre Succursale physique et Département interne), Produits & Services (catalogue, marges, fournisseurs), Clients & Marchés, et Objectifs Stratégiques." },
          { h: "2. Intelligence & Sémantique", p: "Comprend 3 sections : KPI & Indicateurs (catalogue et épinglage au tableau de bord), Dictionnaire de l'entreprise (liaison des termes internes vers les concepts universels GESCOP), et Ce que GESCOP a compris (audit sémantique et confiance)." },
          { h: "3. Surveillance", p: "Surveillance des 12 Domaines du Radar, recommandations sectorielles automatiques et suivi des concurrents directs." },
          { h: "4. Données & Flux", p: "Sources & Connexions : statut d'ingestion des fichiers universels, connecteurs ERP (Acomba, QuickBooks, Sage) et intégrations POS/Shopify." },
          { h: "5. Gouvernance & Système", p: "Gestion des utilisateurs (rôles Administrateur, Analyste, Gestionnaire, Observateur) et Préférences régionales ($ CAD, format de dates, alertes et Loi 25)." },
        ],
      },
    ],
  },
];

// Flatten for lookup
const allSections = groups.flatMap((g) => g.sections);

export default function Manuel() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const firstSectionId = groups[0]?.sections[0]?.id || "demarrage";
  const [activeSection, setActiveSection] = useState(firstSectionId);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar nav */}
      <aside className="lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-6">
          <div className="mb-4 flex items-center gap-3">
            <BrandLogo className="h-11 w-11 shrink-0 border border-border" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Manuel utilisateur</h1>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">GESCOP · Intelligence stratégique</p>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
          >
            {allSections.find((s) => s.id === activeSection)?.title}
            <ChevronDown className={cn("h-4 w-4 transition-transform", mobileNavOpen && "rotate-180")} />
          </button>
          <div className={cn(mobileNavOpen ? "block" : "hidden lg:block")}>
            <ManualTableOfContents groups={groups} onActiveSectionChange={setActiveSection} />
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1 max-w-3xl">
        {allSections.map((s, idx) => (
          <section
            key={s.id}
            id={`section-${s.id}`}
            className={cn(
              "scroll-mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8",
              idx !== 0 && "mt-6"
            )}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
            </div>
            <div className="space-y-5">
              {s.content.map((block, i) => (
                <div key={i} id={`heading-${s.id}-${i}`} className="scroll-mt-20">
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">{block.h}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{block.p}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Besoin d'aide supplémentaire ? Utilisez l'Assistant IA dans le menu latéral pour poser vos questions.
          </p>
        </div>
      </div>
    </div>
  );
}