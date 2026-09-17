// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Radar Engine — Référentiel des Domaines & Profilage Dynamique
// Version 1.0 — Septembre 2026 (Spec Sections 2–20)
// ─────────────────────────────────────────────────────────────────────────────

import {
  type RadarDomain,
  type RadarFamily,
  type RadarDomainDefinition,
  RADAR_DOMAINS,
  RADAR_FAMILIES,
} from "./types.ts";

export const RADAR_FAMILIES_META: Record<
  RadarFamily,
  { label: string; description: string; icon: string }
> = {
  market: {
    label: "Marché & Demande",
    description: "Évolution de la demande globale, comportements clients, prix et dynamiques d'offres.",
    icon: "TrendingUp",
  },
  competitors: {
    label: "Concurrence & Acteurs",
    description: "Mouvements concurrentiels, nouveaux entrants, expansions, fermetures et positionnement.",
    icon: "Crosshair",
  },
  commercial: {
    label: "Commercial & Marketing",
    description: "Campagnes, promotions du marché, canaux publicitaires, communication et influence.",
    icon: "Megaphone",
  },
  tech: {
    label: "Technologie & Innovation",
    description: "IA, automatisation, logiciels, plateformes, commerce électronique et cybersécurité.",
    icon: "Cpu",
  },
  economy: {
    label: "Économie & Finance",
    description: "Taux d'intérêt, inflation, pouvoir d'achat, coûts des matières premières et du crédit.",
    icon: "DollarSign",
  },
  legal: {
    label: "Réglementation & Normes",
    description: "Lois, fiscalité, conformité, droit du travail, normes sectorielles et environnement.",
    icon: "Scale",
  },
  territory_resources: {
    label: "Territoire & Environnement",
    description: "Démographie locale, zones commerciales, météo, saisonnalité climatique et logistique.",
    icon: "MapPin",
  },
  ecosystem: {
    label: "Écosystème & Talents",
    description: "Partenariats, fournisseurs clés, réseaux d'affaires, marché de l'emploi et recrutement.",
    icon: "Users",
  },
};

export const RADAR_DOMAINS_REGISTRY: Record<RadarDomain, RadarDomainDefinition> = {
  // ── FAMILLE A — MARCHÉ ────────────────────────────────────────────────────
  [RADAR_DOMAINS.MARCHE_DEMANDE]: {
    id: RADAR_DOMAINS.MARCHE_DEMANDE,
    family: RADAR_FAMILIES.MARKET,
    name: { fr: "Marché & Demande", en: "Market & Demand" },
    description: {
      fr: "Comprendre comment évolue la taille, la croissance, la saisonnalité et l'intérêt global du marché.",
      en: "Understand market growth, demand shifts, seasonality and emerging categories.",
    },
    trackedElements: ["taille du marché", "croissance", "demande", "tendances de recherche", "saisonnalité", "nouveaux segments"],
    signals: ["DEMAND_INCREASE", "DEMAND_DECREASE", "MARKET_GROWTH", "MARKET_CONTRACTION", "NEW_SEGMENT", "EMERGING_CATEGORY", "SEASONAL_CHANGE"],
    sources: ["Statistiques publiques", "Études de marché sectorielles", "Recherches Google Trends", "Publications spécialisées"],
    affectedModules: ["ventes", "marketing", "stocks", "previsions"],
    relatedKPIs: ["revenue", "sales_growth_pct", "conversion_rate", "average_order_value"],
    defaultPriority: 95,
  },

  [RADAR_DOMAINS.CLIENTS_COMPORTEMENTS]: {
    id: RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
    family: RADAR_FAMILIES.MARKET,
    name: { fr: "Clients & Comportements", en: "Customers & Behaviors" },
    description: {
      fr: "Observer l'évolution des attentes, habitudes d'achat, satisfaction, avis et sensibilité aux prix.",
      en: "Track evolving customer expectations, satisfaction, reviews, and buying habits.",
    },
    trackedElements: ["avis en ligne", "satisfaction", "plaintes récurrentes", "habitudes d'achat", "sensibilité au prix", "nouveaux comportements"],
    signals: ["CUSTOMER_NEED_CHANGE", "SATISFACTION_CHANGE", "REPUTATION_CHANGE", "NEW_CUSTOMER_SEGMENT", "BEHAVIOR_CHANGE"],
    sources: ["Avis Google/Trustpilot", "Réseaux sociaux", "Sondages consommateurs", "Forums sectoriels"],
    affectedModules: ["clients", "ventes", "marketing"],
    relatedKPIs: ["nps", "churn_rate_pct", "retention_rate_pct", "clv", "average_order_value"],
    defaultPriority: 90,
  },

  [RADAR_DOMAINS.PRIX_OFFRES]: {
    id: RADAR_DOMAINS.PRIX_OFFRES,
    family: RADAR_FAMILIES.MARKET,
    name: { fr: "Prix & Offres du Marché", en: "Pricing & Market Offers" },
    description: {
      fr: "Analyser la dynamique globale des prix, promotions, rabais, bundles et conditions commerciales du secteur.",
      en: "Analyze market-wide price movements, discount trends, bundles, and terms.",
    },
    trackedElements: ["prix moyen du marché", "rabais", "bundles", "abonnements", "frais de livraison", "garanties"],
    signals: ["PRICE_INCREASE", "PRICE_DECREASE", "PROMOTION_STARTED", "PROMOTION_ENDED", "OFFER_CHANGED", "BUNDLE_CREATED"],
    sources: ["Comparateurs de prix", "Catalogues publics", "Newsletters promotionnelles", "Marketplaces"],
    affectedModules: ["ventes", "finance", "stocks"],
    relatedKPIs: ["gross_margin_pct", "gross_profit", "conversion_rate", "revenue"],
    defaultPriority: 92,
  },

  [RADAR_DOMAINS.PRODUITS_SERVICES]: {
    id: RADAR_DOMAINS.PRODUITS_SERVICES,
    family: RADAR_FAMILIES.MARKET,
    name: { fr: "Produits & Services", en: "Products & Services" },
    description: {
      fr: "Détecter l'évolution de l'offre disponible, nouveaux lancements, packagings, substitutions et retraits.",
      en: "Detect shifts in market offerings, new launches, packaging changes, and product discontinuations.",
    },
    trackedElements: ["nouveaux produits", "retraits de produits", "nouvelles fonctionnalités", "packaging éco-responsable", "abonnements"],
    signals: ["PRODUCT_LAUNCHED", "PRODUCT_REMOVED", "PRODUCT_MODIFIED", "SERVICE_LAUNCHED", "FEATURE_ADDED", "CATEGORY_CREATED"],
    sources: ["Communiqués de presse", "Salons professionnels", "Brevets", "Catalogues fabricants"],
    affectedModules: ["stocks", "ventes", "operations"],
    relatedKPIs: ["inventory_turnover", "gross_margin_pct", "revenue"],
    defaultPriority: 85,
  },

  // ── FAMILLE B — CONCURRENCE ───────────────────────────────────────────────
  [RADAR_DOMAINS.CONCURRENCE]: {
    id: RADAR_DOMAINS.CONCURRENCE,
    family: RADAR_FAMILIES.COMPETITORS,
    name: { fr: "Concurrence Directe & Mouvements", en: "Direct Competition & Moves" },
    description: {
      fr: "Suivre la stratégie des concurrents : ouvertures de succursales, investissements, positionnement et canaux.",
      en: "Monitor competitor strategy: store openings, acquisitions, repositioning, and expansions.",
    },
    trackedElements: ["concurrents directs", "nouveaux entrants", "expansions", "fermetures", "acquisitions", "succursales"],
    signals: ["COMPETITOR_NEW", "COMPETITOR_EXPANSION", "COMPETITOR_CLOSURE", "COMPETITOR_PARTNERSHIP", "COMPETITOR_ACQUISITION", "COMPETITOR_POSITIONING_CHANGE"],
    sources: ["Registres des entreprises", "Actualités économiques locales", "Sites corporatifs", "Offres d'emploi"],
    affectedModules: ["ventes", "clients", "succursales", "marketing"],
    relatedKPIs: ["revenue", "revenue_per_branch", "market_share", "cac"],
    defaultPriority: 98,
  },

  // ── FAMILLE C — COMMERCIAL ────────────────────────────────────────────────
  [RADAR_DOMAINS.MARKETING_COMMUNICATION]: {
    id: RADAR_DOMAINS.MARKETING_COMMUNICATION,
    family: RADAR_FAMILIES.COMMERCIAL,
    name: { fr: "Marketing & Communication", en: "Marketing & Media" },
    description: {
      fr: "Comprendre les investissements publicitaires, campagnes sur les réseaux sociaux, influence et canaux en vogue.",
      en: "Analyze competitor and industry ad campaigns, social media strategies, and channel shifts.",
    },
    trackedElements: ["campagnes Meta/Google", "influenceurs", "présence TikTok/Instagram", "messages publicitaires", "SEO"],
    signals: ["CAMPAIGN_STARTED", "CAMPAIGN_ENDED", "CHANNEL_ADDED", "MESSAGE_CHANGED", "PROMOTION_LAUNCHED", "POSITIONING_CHANGED"],
    sources: ["Bibliothèque publicitaire Meta", "Google Ads Transparency", "Flux réseaux sociaux", "Newsletters"],
    affectedModules: ["marketing", "ventes"],
    relatedKPIs: ["roas", "cpc", "cpa", "ctr", "marketing_spend"],
    defaultPriority: 88,
  },

  // ── FAMILLE D — TECHNOLOGIE ───────────────────────────────────────────────
  [RADAR_DOMAINS.TECHNOLOGIE_INNOVATION]: {
    id: RADAR_DOMAINS.TECHNOLOGIE_INNOVATION,
    family: RADAR_FAMILIES.TECH,
    name: { fr: "Technologie & Innovation", en: "Technology & AI" },
    description: {
      fr: "Surveiller les technologies susceptibles de transformer le secteur : IA, automatisation, e-commerce et cybersécurité.",
      en: "Track industry-disrupting technologies: AI adoption, automation, modern ERPs, and e-commerce tools.",
    },
    trackedElements: ["IA générative", "automatisation logistique", "logiciels POS/ERP", "paiements numériques", "cybersécurité"],
    signals: ["TECHNOLOGY_LAUNCHED", "AI_ADOPTION", "AUTOMATION_ADOPTION", "SOFTWARE_CHANGE", "PLATFORM_CHANGE", "TECHNOLOGY_DISRUPTION"],
    sources: ["Publications technologiques", "Annonces éditeurs", "Forums SaaS", "Rapports d'innovation"],
    affectedModules: ["operations", "rh", "finance"],
    relatedKPIs: ["revenue_per_employee", "operating_expenses", "productivity"],
    defaultPriority: 82,
  },

  // ── FAMILLE E — ÉCONOMIE ──────────────────────────────────────────────────
  [RADAR_DOMAINS.ECONOMIE_FINANCE]: {
    id: RADAR_DOMAINS.ECONOMIE_FINANCE,
    family: RADAR_FAMILIES.ECONOMY,
    name: { fr: "Économie & Finance Externe", en: "Macroeconomics & Finance" },
    description: {
      fr: "Surveiller les variables macroéconomiques : inflation, taux directeurs, taux de change, coût du crédit et pouvoir d'achat.",
      en: "Monitor macroeconomic drivers: interest rates, inflation, exchange rates, and consumer confidence.",
    },
    trackedElements: ["taux d'intérêt Banque du Canada", "inflation IPC", "taux de change CAD/USD", "coût du crédit", "pouvoir d'achat"],
    signals: ["INTEREST_RATE_CHANGE", "INFLATION_SURGE", "CURRENCY_SHIFT", "CONSUMER_CONFIDENCE_CHANGE", "CREDIT_TIGHTENING"],
    sources: ["Banque du Canada", "Statistique Canada", "Rapports des banques à charte", "Presse économique"],
    affectedModules: ["tresorerie", "finance", "previsions"],
    relatedKPIs: ["net_cash_flow", "operating_profit", "burn_rate", "runway_months"],
    defaultPriority: 90,
  },

  // ── FAMILLE F — RÉGLEMENTATION ────────────────────────────────────────────
  [RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE]: {
    id: RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE,
    family: RADAR_FAMILIES.LEGAL,
    name: { fr: "Réglementation & Normes", en: "Regulations & Law" },
    description: {
      fr: "Détecter les lois, décrets, normes de travail, règles environnementales et fiscales affectant le secteur.",
      en: "Detect legislative changes, tax laws, environmental requirements, and labor standards.",
    },
    trackedElements: ["lois du travail", "fiscalité", "normes environnementales", "permis municipaux", "protection du consommateur", "normes de sécurité"],
    signals: ["REGULATION_PROPOSED", "REGULATION_ADOPTED", "REGULATION_IN_EFFECT", "TAX_POLICY_CHANGE", "LABOR_LAW_CHANGE"],
    sources: ["Gazette officielle", "Ministères provinciaux/fédéraux", "Associations patronales", "Veille juridique"],
    affectedModules: ["operations", "rh", "finance"],
    relatedKPIs: ["operating_expenses", "payroll_ratio_pct"],
    defaultPriority: 86,
  },

  // ── FAMILLE G — TERRITOIRE & RESSOURCES ───────────────────────────────────
  [RADAR_DOMAINS.TERRITOIRE_LOCAL]: {
    id: RADAR_DOMAINS.TERRITOIRE_LOCAL,
    family: RADAR_FAMILIES.TERRITORY_RESOURCES,
    name: { fr: "Territoire & Environnement Local", en: "Territory & Local Hubs" },
    description: {
      fr: "Observer les dynamiques géographiques : démographie, nouvelles zones commerciales, travaux routiers et vitalité des quartiers.",
      en: "Track local urban dynamics: population growth, commercial hubs, roadworks, and municipal developments.",
    },
    trackedElements: ["démographie locale", "projets immobiliers", "infrastructures routières", "zones commerciales", "vitalité des centres-villes"],
    signals: ["DEMOGRAPHIC_GROWTH", "URBAN_DEVELOPMENT", "INFRASTRUCTURE_PROJECT", "COMMERCIAL_HUB_SHIFT"],
    sources: ["Données municipales", "Sociétés d'aménagement", "Permis de bâtir", "Chambres de commerce"],
    affectedModules: ["succursales", "ventes"],
    relatedKPIs: ["revenue_per_branch", "profit_per_branch"],
    defaultPriority: 84,
  },

  [RADAR_DOMAINS.ENVIRONNEMENT_METEO]: {
    id: RADAR_DOMAINS.ENVIRONNEMENT_METEO,
    family: RADAR_FAMILIES.TERRITORY_RESOURCES,
    name: { fr: "Météo & Climat (Transversal)", en: "Weather & Climate" },
    description: {
      fr: "Surveiller la saisonnalité climatique, les vagues de chaleur/froid, la météo sportive et leur impact sur la fréquentation.",
      en: "Track weather anomalies, outdoor seasonality, snow/rain records impacting foot traffic.",
    },
    trackedElements: ["météo régionale", "début/fin de saison sportive", "enneigement", "précipitations anormales", "vagues de froid"],
    signals: ["WEATHER_ANOMALY", "SEASONAL_SHIFT", "EARLY_SEASON", "LATE_SEASON"],
    sources: ["Environnement Canada", "Stations météo locales", "Bulletins de neige"],
    affectedModules: ["ventes", "stocks", "succursales"],
    relatedKPIs: ["revenue", "inventory_turnover"],
    defaultPriority: 80,
  },

  [RADAR_DOMAINS.SUPPLY_CHAIN]: {
    id: RADAR_DOMAINS.SUPPLY_CHAIN,
    family: RADAR_FAMILIES.TERRITORY_RESOURCES,
    name: { fr: "Approvisionnement & Logistique", en: "Supply Chain & Logistics" },
    description: {
      fr: "Observer les délais des transporteurs, pénuries de composants, hausses de fret et goulets d'étranglement.",
      en: "Monitor shipping delays, component shortages, freight costs, and supplier lead times.",
    },
    trackedElements: ["délais de livraison", "coût du fret", "matières premières", "ruptures fournisseurs", "ports et transport ferroviaire"],
    signals: ["SUPPLIER_DELAY", "SUPPLY_SHORTAGE", "COST_INCREASE", "LOGISTICS_DISRUPTION"],
    sources: ["Indices de fret", "Rapports logistiques", "Annonces de transporteurs", "Communiqués fournisseurs"],
    affectedModules: ["stocks", "operations", "finance"],
    relatedKPIs: ["cogs", "inventory_turnover", "gross_margin_pct"],
    defaultPriority: 85,
  },

  // ── FAMILLE H — ÉCOSYSTÈME & TALENTS ──────────────────────────────────────
  [RADAR_DOMAINS.TALENTS_EMPLOI]: {
    id: RADAR_DOMAINS.TALENTS_EMPLOI,
    family: RADAR_FAMILIES.ECOSYSTEM,
    name: { fr: "Talents & Marché de l'Emploi", en: "Talents & Job Market" },
    description: {
      fr: "Observer la dynamique des recrutements, niveaux de salaires affichés, pénuries de main-d'œuvre et mouvements RH clés.",
      en: "Track job postings, market wage rates, labor shortages, and competitor talent acquisition.",
    },
    trackedElements: ["offres d'emploi sectorielles", "salaires affichés", "pénuries de métiers", "embauches massives chez concurrents"],
    signals: ["HIRING_INCREASE", "HIRING_DECREASE", "SALARY_CHANGE", "SKILL_DEMAND_CHANGE", "LABOR_SHORTAGE"],
    sources: ["Indeed", "LinkedIn Jobs", "Statistiques de l'emploi Québec", "Rapports RH sectoriels"],
    affectedModules: ["rh", "operations"],
    relatedKPIs: ["payroll_ratio_pct", "revenue_per_employee"],
    defaultPriority: 82,
  },

  [RADAR_DOMAINS.ECOSYSTEME_PARTENAIRES]: {
    id: RADAR_DOMAINS.ECOSYSTEME_PARTENAIRES,
    family: RADAR_FAMILIES.ECOSYSTEM,
    name: { fr: "Partenaires & Écosystème", en: "Partners & Ecosystem" },
    description: {
      fr: "Surveiller les alliances stratégiques, plateformes partenaires, distributeurs et opportunités de partenariats.",
      en: "Monitor strategic alliances, key distributor networks, platforms, and industry associations.",
    },
    trackedElements: ["alliances commerciales", "nouveaux distributeurs", "plateformes technologiques", "associations professionnelles"],
    signals: ["PARTNERSHIP", "DISTRIBUTION_CHANGE", "PLATFORM_CHANGE", "STRATEGIC_ALLIANCE"],
    sources: ["Actualités d'affaires", "Communiqués d'entreprises", "Associations industrielles"],
    affectedModules: ["ventes", "marketing", "operations"],
    relatedKPIs: ["revenue", "sales_growth_pct"],
    defaultPriority: 78,
  },

  // ── DOMAINE CROISÉ ────────────────────────────────────────────────────────
  [RADAR_DOMAINS.RISQUES_OPPORTUNITES_SIGNAUX_FAIBLES]: {
    id: RADAR_DOMAINS.RISQUES_OPPORTUNITES_SIGNAUX_FAIBLES,
    family: RADAR_FAMILIES.MARKET,
    name: { fr: "Risques, Opportunités & Signaux Faibles", en: "Risks & Weak Signals" },
    description: {
      fr: "Moteur de synthèse croisant plusieurs signaux externes et internes pour révéler les opportunités et menaces émergentes.",
      en: "Synthesizes multiple external signals and internal KPIs to surface emerging risks and high-impact opportunities.",
    },
    trackedElements: ["conjonctions de signaux", "inférences pluridisciplinaires", "opportunités de croissance", "alertes préventives"],
    signals: ["OPPORTUNITY_DETECTED", "THREAT_DETECTED", "WEAK_SIGNAL_EMERGING"],
    sources: ["Moteur d'inférence GESCOP", "Croisement cross-domaines"],
    affectedModules: ["finance", "ventes", "marketing", "stocks", "previsions"],
    relatedKPIs: ["gross_profit", "gross_margin_pct", "revenue"],
    defaultPriority: 100,
  },
};

/**
 * Moteur de profilage dynamique (Spec Section 19)
 * Détecte les domaines prioritaires et pertinents pour une entreprise donnée.
 */
export function detectRelevantDomains(
  sector = "",
  businessModel = ""
): {
  primaryDomains: RadarDomain[];
  secondaryDomains: RadarDomain[];
  activeFamilies: RadarFamily[];
  sectorProfileName: string;
} {
  const normSec = (sector + " " + businessModel).toLowerCase();

  // 1. Profil Commerce de détail / Plein Air / Distribution
  if (normSec.includes("plein air") || normSec.includes("retail") || normSec.includes("detail") || normSec.includes("magasin") || normSec.includes("boutique") || normSec.includes("sport")) {
    return {
      sectorProfileName: "Commerce de Détail & Plein Air",
      primaryDomains: [
        RADAR_DOMAINS.CONCURRENCE,
        RADAR_DOMAINS.PRIX_OFFRES,
        RADAR_DOMAINS.PRODUITS_SERVICES,
        RADAR_DOMAINS.MARCHE_DEMANDE,
        RADAR_DOMAINS.ENVIRONNEMENT_METEO,
        RADAR_DOMAINS.TERRITOIRE_LOCAL,
      ],
      secondaryDomains: [
        RADAR_DOMAINS.SUPPLY_CHAIN,
        RADAR_DOMAINS.MARKETING_COMMUNICATION,
        RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
        RADAR_DOMAINS.TALENTS_EMPLOI,
      ],
      activeFamilies: [
        RADAR_FAMILIES.COMPETITORS,
        RADAR_FAMILIES.MARKET,
        RADAR_FAMILIES.TERRITORY_RESOURCES,
        RADAR_FAMILIES.COMMERCIAL,
        RADAR_FAMILIES.ECOSYSTEM,
      ],
    };
  }

  // 2. Profil Restaurant / Restauration
  if (normSec.includes("restaurant") || normSec.includes("restauration") || normSec.includes("cafe") || normSec.includes("bar") || normSec.includes("alimentation")) {
    return {
      sectorProfileName: "Restauration & Alimentation",
      primaryDomains: [
        RADAR_DOMAINS.MARCHE_DEMANDE,
        RADAR_DOMAINS.CONCURRENCE,
        RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
        RADAR_DOMAINS.PRIX_OFFRES,
        RADAR_DOMAINS.SUPPLY_CHAIN,
        RADAR_DOMAINS.TERRITOIRE_LOCAL,
      ],
      secondaryDomains: [
        RADAR_DOMAINS.ENVIRONNEMENT_METEO,
        RADAR_DOMAINS.TALENTS_EMPLOI,
        RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE,
        RADAR_DOMAINS.MARKETING_COMMUNICATION,
      ],
      activeFamilies: [
        RADAR_FAMILIES.MARKET,
        RADAR_FAMILIES.COMPETITORS,
        RADAR_FAMILIES.TERRITORY_RESOURCES,
        RADAR_FAMILIES.ECOSYSTEM,
        RADAR_FAMILIES.LEGAL,
      ],
    };
  }

  // 3. Profil E-commerce
  if (normSec.includes("e-commerce") || normSec.includes("ecommerce") || normSec.includes("en ligne") || normSec.includes("web") || normSec.includes("saas")) {
    return {
      sectorProfileName: "E-Commerce & Digital",
      primaryDomains: [
        RADAR_DOMAINS.CONCURRENCE,
        RADAR_DOMAINS.PRIX_OFFRES,
        RADAR_DOMAINS.PRODUITS_SERVICES,
        RADAR_DOMAINS.MARKETING_COMMUNICATION,
        RADAR_DOMAINS.TECHNOLOGIE_INNOVATION,
        RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
      ],
      secondaryDomains: [
        RADAR_DOMAINS.SUPPLY_CHAIN,
        RADAR_DOMAINS.ECONOMIE_FINANCE,
        RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE,
      ],
      activeFamilies: [
        RADAR_FAMILIES.COMPETITORS,
        RADAR_FAMILIES.MARKET,
        RADAR_FAMILIES.COMMERCIAL,
        RADAR_FAMILIES.TECH,
        RADAR_FAMILIES.ECONOMY,
      ],
    };
  }

  // 4. Profil B2B & Services Professionnels
  if (normSec.includes("b2b") || normSec.includes("service") || normSec.includes("conseil") || normSec.includes("consulting") || normSec.includes("agence")) {
    return {
      sectorProfileName: "Services Professionnels & B2B",
      primaryDomains: [
        RADAR_DOMAINS.MARCHE_DEMANDE,
        RADAR_DOMAINS.CONCURRENCE,
        RADAR_DOMAINS.TECHNOLOGIE_INNOVATION,
        RADAR_DOMAINS.TALENTS_EMPLOI,
        RADAR_DOMAINS.ECOSYSTEME_PARTENAIRES,
      ],
      secondaryDomains: [
        RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE,
        RADAR_DOMAINS.ECONOMIE_FINANCE,
        RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
      ],
      activeFamilies: [
        RADAR_FAMILIES.MARKET,
        RADAR_FAMILIES.COMPETITORS,
        RADAR_FAMILIES.TECH,
        RADAR_FAMILIES.ECOSYSTEM,
        RADAR_FAMILIES.LEGAL,
      ],
    };
  }

  // Profil Universel par défaut
  return {
    sectorProfileName: "Entreprise Universelle",
    primaryDomains: [
      RADAR_DOMAINS.CONCURRENCE,
      RADAR_DOMAINS.MARCHE_DEMANDE,
      RADAR_DOMAINS.PRIX_OFFRES,
      RADAR_DOMAINS.CLIENTS_COMPORTEMENTS,
      RADAR_DOMAINS.ECONOMIE_FINANCE,
    ],
    secondaryDomains: [
      RADAR_DOMAINS.PRODUITS_SERVICES,
      RADAR_DOMAINS.MARKETING_COMMUNICATION,
      RADAR_DOMAINS.TECHNOLOGIE_INNOVATION,
      RADAR_DOMAINS.REGLEMENTATION_JURIDIQUE,
      RADAR_DOMAINS.TERRITOIRE_LOCAL,
      RADAR_DOMAINS.TALENTS_EMPLOI,
    ],
    activeFamilies: Object.values(RADAR_FAMILIES),
  };
}

