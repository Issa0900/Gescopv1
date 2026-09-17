// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Radar Engine — Types & Domaines du Référentiel
// Version 1.0 — Septembre 2026 (Spec Section 1-23)
// ─────────────────────────────────────────────────────────────────────────────

export const RADAR_FAMILIES = {
  MARKET: "market", // FAMILLE A — MARCHÉ
  COMPETITORS: "competitors", // FAMILLE B — CONCURRENCE
  COMMERCIAL: "commercial", // FAMILLE C — COMMERCIAL
  TECH: "tech", // FAMILLE D — TECHNOLOGIE
  ECONOMY: "economy", // FAMILLE E — ÉCONOMIE
  LEGAL: "legal", // FAMILLE F — RÉGLEMENTATION
  TERRITORY_RESOURCES: "territory_resources", // FAMILLE G — TERRITOIRE & RESSOURCES
  ECOSYSTEM: "ecosystem", // FAMILLE H — ÉCOSYSTÈME
} as const;

export type RadarFamily = (typeof RADAR_FAMILIES)[keyof typeof RADAR_FAMILIES];

export const RADAR_DOMAINS = {
  // 12 Domaines Principaux (Spec Section 2-14)
  CONCURRENCE: "concurrence",
  MARCHE_DEMANDE: "marche_demande",
  CLIENTS_COMPORTEMENTS: "clients_comportements",
  PRIX_OFFRES: "prix_offres",
  PRODUITS_SERVICES: "produits_services",
  MARKETING_COMMUNICATION: "marketing_communication",
  TECHNOLOGIE_INNOVATION: "technologie_innovation",
  ECONOMIE_FINANCE: "economie_finance",
  REGLEMENTATION_JURIDIQUE: "reglementation_juridique",
  TERRITOIRE_LOCAL: "territoire_local",
  TALENTS_EMPLOI: "talents_emploi",
  RISQUES_OPPORTUNITES_SIGNAUX_FAIBLES: "risques_opportunites_signaux_faibles",

  // Domaines Transversaux (Spec Section 15-17)
  ENVIRONNEMENT_METEO: "environnement_meteo",
  SUPPLY_CHAIN: "supply_chain",
  ECOSYSTEME_PARTENAIRES: "ecosysteme_partenaires",
} as const;

export type RadarDomain = (typeof RADAR_DOMAINS)[keyof typeof RADAR_DOMAINS];

export interface RadarDomainDefinition {
  id: RadarDomain;
  family: RadarFamily;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  trackedElements: string[];
  signals: string[];
  sources: string[];
  affectedModules: string[];
  relatedKPIs: string[];
  defaultPriority: number; // 1-100
}

export interface RadarSignal {
  id?: string;
  title: string;
  domain: RadarDomain;
  subdomain?: string;
  family: RadarFamily;
  entityName?: string;
  event: string;
  source: string;
  url: string;
  date: string;
  location?: string;
  magnitude?: string; // ex: "-13.38%"
  direction?: "hausse" | "baisse" | "stable" | "nouveau" | "alerte";
  confidence: number; // 0-100
  impact: "positif" | "neutre" | "negatif";
  
  // Les 5 Questions Fondamentales (Spec Section 22)
  fact: string; // 1. Qu'est-ce qui change ? (Le fait observé)
  whereLocation: string; // 2. Où ?
  sinceWhen: string; // 3. Depuis quand ?
  inference: string; // 4. Quel est l'impact potentiel ? (Inférence non affirmative)
  monitoringTip: string; // 5. Que faut-il surveiller ?

  recommendedAction?: string;
  affectedKPIs: string[];
  internalConnection?: string;
  status: "nouveau" | "vu" | "archive";
}

export interface CrossSignalInsight {
  id: string;
  title: string;
  family: RadarFamily;
  domainsInvolved: RadarDomain[];
  externalSignals: string[];
  internalFactors: string[];
  fact: string;
  inference: string;
  recommendedAction: string;
  priorityScore: number;
  impact: "positif" | "neutre" | "negatif";
}

