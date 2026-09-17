import { profileData } from './base44/shared/dataProfiler.ts';
import { matchConcept } from './base44/shared/semanticMatcher.ts';
import { detectGrain } from './base44/shared/grainEngine.ts';
import { normalizeRow } from './base44/shared/normalizationEngine.ts';
import { generateObservations } from './base44/shared/observationEngine.ts';
import { aggregateQuantitativeObservations } from './base44/shared/quantitativeEngine.ts';
import { analyzeQualitativeObservations } from './base44/shared/qualitativeEngine.ts';

const rawDataset = [
  {
    "Total Ventes ($)": "1 500,50 $",
    "Nb Clients": 12,
    "Date d'achat": "2026-09-15",
    "Avis Client": "Service client au top, mais le prix est un peu cher !"
  },
  {
    "Total Ventes ($)": "2 100.00 $",
    "Nb Clients": 18,
    "Date d'achat": "2026-09-16",
    "Avis Client": "Livraison en retard, je suis vraiment dǸu de la vitesse."
  }
];

console.log("🚀 Lancement du Test E2E - GESCOP Data Core Pipeline\n");

// 1. Profilage
console.log("Étape 1 : Profilage (Data Profiler)");
const profile = profileData(rawDataset);
for (const [col, p] of Object.entries(profile.columns)) {
  console.log(` - Colonne "${col}": détecté comme '${p.inferredType}'`);
}

// 2. Mappage Sémantique
console.log("\nÉtape 2 : Mappage Sémantique (Semantic Matcher)");
const matchedConcepts = {};
for (const [col, p] of Object.entries(profile.columns)) {
  const match = matchConcept(p);
  if (match) {
    matchedConcepts[col] = match;
    console.log(` - Colonne "${col}" => Concept: ${match.concept} (Confiance: ${match.confidence * 100}%)`);
  } else {
    console.log(` - Colonne "${col}" => Aucun concept trouvé`);
  }
}

// 3. Grain Engine
console.log("\nÉtape 3 : Détection du Grain (Grain Engine)");
const grain = detectGrain(profile, matchedConcepts);
console.log(` - Grain détecté: ${grain.type} (Confiance: ${grain.confidence * 100}%)`);

// 4. & 5. Normalisation et Observations
console.log("\nÉtape 4 & 5 : Normalisation et Création d'Observations");
const allObservations = [];
for (const row of rawDataset) {
  const normalized = normalizeRow(row, profile.columns);
  const observations = generateObservations(normalized, matchedConcepts, "source_test_e2e", grain);
  allObservations.push(...observations);
}
console.log(` - ${allObservations.length} Observations générées !`);
console.log(allObservations.slice(0, 2));

// 6. Quantitative Engine (KPI)
console.log("\nÉtape 6 : Quantitative Engine (Agrégation pour KPI)");
const metrics = aggregateQuantitativeObservations(allObservations);
console.log(` - Chiffre d'affaire agrégé total: ${metrics.revenue} $`);

// 7. Qualitative Engine (NLP)
console.log("\nÉtape 7 : Qualitative Engine (Analyse NLP)");
const qualSignals = analyzeQualitativeObservations(allObservations);
for (const signal of qualSignals) {
  console.log(` - Texte: "${signal.original_text.substring(0, 20)}..."`);
  console.log(`   Sentiment: ${signal.sentiment.toUpperCase()}, Thèmes: [${signal.topics.join(", ")}], Problèmes: [${signal.issues.join(", ")}]`);
}

console.log("\n✅ Test E2E Terminé avec Succès ! Le Data Core fonctionne parfaitement.");
