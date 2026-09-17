// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Radar Engine — Cross-Signal Engine & Inférences Multi-Domaines
// Version 1.0 — Septembre 2026 (Spec Section 14, 22, 23)
// ─────────────────────────────────────────────────────────────────────────────

import { type RadarSignal, type CrossSignalInsight, RADAR_DOMAINS, RADAR_FAMILIES } from "./types.ts";

export interface CrossSignalInput {
  externalSignals: RadarSignal[];
  internalMetrics?: Record<string, number>;
  companyName?: string;
}

/**
 * Moteur de croisement des signaux externes avec les données internes (Spec Section 14 & 23)
 * Règle d'or : distingue strictement [FAIT], [INFÉRENCE] et [HYPOTHÈSE / ACTION].
 */
export function generateCrossSignalInsights(input: CrossSignalInput): CrossSignalInsight[] {
  const { externalSignals, internalMetrics = {}, companyName = "votre entreprise" } = input;
  const insights: CrossSignalInsight[] = [];

  if (!externalSignals || externalSignals.length === 0) return insights;

  // 1. Détecter signal concurrentiel (nouvelles embauches ou expansion)
  const hiringSignals = externalSignals.filter(
    (s) => s.event === "HIRING_INCREASE" || s.event === "COMPETITOR_EXPANSION" || /embauche|recrutement|expansion|succursale/i.test(s.title)
  );

  if (hiringSignals.length > 0) {
    const s = hiringSignals[0];
    insights.push({
      id: "cs-competitor-growth",
      title: "Mouvement d'expansion concurrentielle détecté",
      family: RADAR_FAMILIES.COMPETITORS,
      domainsInvolved: [RADAR_DOMAINS.CONCURRENCE, RADAR_DOMAINS.TALENTS_EMPLOI],
      externalSignals: [s.title],
      internalFactors: ["Parts de marché locales", "Ventes par succursale"],
      fact: `[FAIT OBSERVÉ] ${s.fact || s.title} (Source : ${s.source || "Presse / Emploi"}).`,
      inference: "[INFÉRENCE PROBABLE] Ce renforcement d'équipe ou cette ouverture pourrait traduire une volonté d'accroître la capacité commerciale ou de capter des parts de marché sur votre zone de chalandise.",
      recommendedAction: "[HYPOTHÈSE / ACTION] Auditer votre différentiation de service, surveiller vos marges sur les produits phares et fidéliser vos clients clés via des offres ciblées.",
      priorityScore: 92,
      impact: "negatif",
    });
  }

  // 2. Détecter signal de prix (baisse de prix ou promotions concurrentes)
  const priceSignals = externalSignals.filter(
    (s) => s.event === "PRICE_DECREASE" || s.event === "PROMOTION_STARTED" || /baisse de prix|rabais|solde|promotion/i.test(s.title)
  );

  if (priceSignals.length > 0) {
    const ps = priceSignals[0];
    const margin = internalMetrics.gross_margin_pct;
    insights.push({
      id: "cs-price-pressure",
      title: "Pression baissière sur les prix du marché",
      family: RADAR_FAMILIES.MARKET,
      domainsInvolved: [RADAR_DOMAINS.PRIX_OFFRES, RADAR_DOMAINS.CONCURRENCE],
      externalSignals: [ps.title],
      internalFactors: margin ? [`Marge brute interne actuelle : ${margin}%`] : ["Taux de conversion interne"],
      fact: `[FAIT OBSERVÉ] ${ps.fact || ps.title}.`,
      inference: `[INFÉRENCE PROBABLE] Si le marché généralise cette baisse, une érosion de la conversion pourrait survenir sans ajustement de valeur perçue${margin && margin < 35 ? " (vigilance : votre marge brute est déjà serrée)" : ""}.`,
      recommendedAction: "[HYPOTHÈSE / ACTION] Éviter une guerre des prix frontale : packager des bundles à valeur ajoutée ou valoriser la garantie locale plutôt que de rogner la marge.",
      priorityScore: 88,
      impact: "neutre",
    });
  }

  // 3. Détecter opportunité de demande ou tendance émergente
  const demandSignals = externalSignals.filter(
    (s) => s.event === "DEMAND_INCREASE" || s.event === "MARKET_GROWTH" || /hausse de la demande|croissance|tendance|intérêt/i.test(s.title)
  );

  if (demandSignals.length > 0) {
    const ds = demandSignals[0];
    insights.push({
      id: "cs-demand-opportunity",
      title: "Opportunité d'accélération de la demande",
      family: RADAR_FAMILIES.MARKET,
      domainsInvolved: [RADAR_DOMAINS.MARCHE_DEMANDE, RADAR_DOMAINS.PRODUITS_SERVICES],
      externalSignals: [ds.title],
      internalFactors: ["Chiffre d'affaires", "Rotation des stocks"],
      fact: `[FAIT OBSERVÉ] ${ds.fact || ds.title}.`,
      inference: "[INFÉRENCE PROBABLE] La montée de l'intérêt pour cette catégorie ouvre une fenêtre d'acquisition client favorable à court et moyen terme.",
      recommendedAction: "[HYPOTHÈSE / ACTION] Mettre en avant ces gammes de produits dans vos vitrines physiques et numériques, et vérifier vos seuils de réapprovisionnement pour éviter toute rupture.",
      priorityScore: 94,
      impact: "positif",
    });
  }

  // 4. Détecter tension logistique ou hausse de coûts d'approvisionnement
  const supplySignals = externalSignals.filter(
    (s) => s.event === "SUPPLY_SHORTAGE" || s.event === "COST_INCREASE" || /fret|transport|rupture|approvisionnement|coût matière/i.test(s.title)
  );

  if (supplySignals.length > 0) {
    const ss = supplySignals[0];
    insights.push({
      id: "cs-supply-alert",
      title: "Vigilance sur les coûts d'approvisionnement",
      family: RADAR_FAMILIES.TERRITORY_RESOURCES,
      domainsInvolved: [RADAR_DOMAINS.SUPPLY_CHAIN, RADAR_DOMAINS.ECONOMIE_FINANCE],
      externalSignals: [ss.title],
      internalFactors: ["COGS", "Trésorerie disponible"],
      fact: `[FAIT OBSERVÉ] ${ss.fact || ss.title}.`,
      inference: "[INFÉRENCE PROBABLE] Les délais de livraison pourraient s'allonger et vos coûts d'achat unitaires pourraient subir une révision à la hausse.",
      recommendedAction: "[HYPOTHÈSE / ACTION] Consolider vos commandes auprès de fournisseurs alternatifs et sécuriser vos stocks stratégiques en amont.",
      priorityScore: 86,
      impact: "negatif",
    });
  }

  return insights;
}

