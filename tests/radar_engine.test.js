import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RADAR_DOMAINS_REGISTRY,
  RADAR_FAMILIES_META,
  detectRelevantDomains,
  generateCrossSignalInsights,
  RADAR_DOMAINS,
  RADAR_FAMILIES,
} from '../base44/shared/core/radar/index.ts';

test('Radar Référentiel — Couverture des 12 domaines et 8 familles', () => {
  const domainKeys = Object.keys(RADAR_DOMAINS_REGISTRY);
  assert.ok(domainKeys.length >= 15, `Le registre doit contenir au moins 15 domaines (12 principaux + 3 transversaux, actuel: ${domainKeys.length})`);

  // Vérifier la présence des 8 familles
  const familyKeys = Object.keys(RADAR_FAMILIES_META);
  assert.equal(familyKeys.length, 8, 'Il doit y avoir exactement 8 grandes familles');
  assert.ok(familyKeys.includes(RADAR_FAMILIES.MARKET));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.COMPETITORS));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.COMMERCIAL));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.TECH));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.ECONOMY));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.LEGAL));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.TERRITORY_RESOURCES));
  assert.ok(familyKeys.includes(RADAR_FAMILIES.ECOSYSTEM));

  // Vérifier l'intégrité de chaque domaine
  for (const def of Object.values(RADAR_DOMAINS_REGISTRY)) {
    assert.ok(def.id, 'Chaque domaine doit avoir un ID');
    assert.ok(def.name.fr, 'Chaque domaine doit avoir un nom FR');
    assert.ok(def.family, 'Chaque domaine doit être rattaché à une famille');
    assert.ok(Array.isArray(def.trackedElements) && def.trackedElements.length > 0, 'Chaque domaine doit lister des éléments surveillés');
    assert.ok(Array.isArray(def.relatedKPIs) && def.relatedKPIs.length > 0, 'Chaque domaine doit lister des KPIs reliables');
  }
});

test('Radar Profilage Dynamique — Adaptation sectorielle (Spec Section 19)', () => {
  // 1. Profil Plein Air / Commerce de Détail (comme Nordik Plein Air)
  const retailProfile = detectRelevantDomains('Commerce de détail plein air', 'Boutiques physiques et e-commerce');
  assert.equal(retailProfile.sectorProfileName, 'Commerce de Détail & Plein Air');
  assert.ok(retailProfile.primaryDomains.includes(RADAR_DOMAINS.CONCURRENCE));
  assert.ok(retailProfile.primaryDomains.includes(RADAR_DOMAINS.PRIX_OFFRES));
  assert.ok(retailProfile.primaryDomains.includes(RADAR_DOMAINS.ENVIRONNEMENT_METEO));

  // 2. Profil Restaurant
  const restaurantProfile = detectRelevantDomains('Restauration', 'Restaurant avec service aux tables');
  assert.equal(restaurantProfile.sectorProfileName, 'Restauration & Alimentation');
  assert.ok(restaurantProfile.primaryDomains.includes(RADAR_DOMAINS.SUPPLY_CHAIN));
  assert.ok(restaurantProfile.primaryDomains.includes(RADAR_DOMAINS.TERRITOIRE_LOCAL));

  // 3. Profil E-Commerce
  const ecomProfile = detectRelevantDomains('E-commerce', 'Vente en ligne directe');
  assert.equal(ecomProfile.sectorProfileName, 'E-Commerce & Digital');
  assert.ok(ecomProfile.primaryDomains.includes(RADAR_DOMAINS.MARKETING_COMMUNICATION));
  assert.ok(ecomProfile.primaryDomains.includes(RADAR_DOMAINS.TECHNOLOGIE_INNOVATION));
});

test('Radar Cross-Signal Engine — Règle stricte [FAIT] vs [INFÉRENCE] vs [HYPOTHÈSE] (Spec Section 13, 14, 23)', () => {
  const sampleSignals = [
    {
      title: 'Sail Plein Air ouvre une nouvelle succursale à Lévis',
      domain: RADAR_DOMAINS.CONCURRENCE,
      family: RADAR_FAMILIES.COMPETITORS,
      event: 'COMPETITOR_EXPANSION',
      source: 'Le Soleil',
      url: 'https://lesoleil.com/affaires/sail-levis',
      date: '2026-03-01',
      fact: 'Ouverture confirmée d’une succursale de 30 000 pi² à Lévis à l’automne 2026.',
      whereLocation: 'Lévis, QC',
      sinceWhen: '2026-03-01',
      inference: 'Une pression concurrentielle accrue sur les équipements de camping pourrait impacter les ventes locales.',
      monitoringTip: 'Surveiller les promotions de lancement de Sail et la fréquentation de votre succursale de Lévis.',
      confidence: 95,
      impact: 'negatif',
      affectedKPIs: ['revenue_per_branch', 'gross_margin_pct'],
      status: 'nouveau',
    },
    {
      title: 'Baisse de 15% sur les tentes 4 saisons sur les sites concurrents',
      domain: RADAR_DOMAINS.PRIX_OFFRES,
      family: RADAR_FAMILIES.MARKET,
      event: 'PRICE_DECREASE',
      source: 'Veille tarifaire Web',
      url: 'https://quebecoutdoor.ca/prix',
      date: '2026-03-05',
      fact: 'Prix moyen observé en baisse de 15% sur la catégorie Tentes 4 saisons.',
      whereLocation: 'Québec',
      sinceWhen: '2026-03-05',
      inference: 'Risque d’érosion de la marge brute si alignement brutal sans contrepartie.',
      monitoringTip: 'Suivre les taux de conversion internes sur le rayon camping.',
      confidence: 90,
      impact: 'neutre',
      affectedKPIs: ['gross_margin_pct', 'conversion_rate'],
      status: 'nouveau',
    },
  ];

  const internalMetrics = {
    gross_margin_pct: 39.4,
    revenue: 3020000,
  };

  const insights = generateCrossSignalInsights({
    externalSignals: sampleSignals,
    internalMetrics,
    companyName: 'Nordik Plein Air',
  });

  assert.ok(insights.length >= 2, `Doit générer au moins 2 inférences croisées (actuel: ${insights.length})`);

  for (const ins of insights) {
    assert.match(ins.fact, /\[FAIT OBSERVÉ\]/i, 'Chaque inférence doit citer explicitement le fait observé');
    assert.match(ins.inference, /\[INFÉRENCE PROBABLE\]/i, 'Chaque inférence doit être qualifiée de probable, pas de certitude absolue');
    assert.match(ins.recommendedAction, /\[HYPOTHÈSE \/ ACTION\]/i, 'Chaque recommandation doit être explicitement formulée');
    assert.ok(ins.priorityScore >= 50 && ins.priorityScore <= 100, 'Score de priorité valide');
    assert.ok(ins.domainsInvolved.length >= 2, 'Doit lier au moins 2 domaines ou dimensions');
  }
});

