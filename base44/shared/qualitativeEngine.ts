/**
 * GESCOP - Qualitative Engine
 * 
 * Phase 3 du Pipeline d'Intelligence
 * Rle : Analyser les observations textuelles (commentaires, plaintes, reviews),
 * dǸtecter les thmes (Topics), le sentiment, et Ǹmettre des signaux qualitatifs
 * pour nourrir l'Evidence Engine.
 */

import { Observation } from './observationEngine.ts';

export type QualitativeSignal = {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  issues: string[];
  confidence: number;
  original_text: string;
};

// Dictionnaire basique de NLP (À remplacer par un appel LLM via l'AI Engine)
const SENTIMENT_KEYWORDS = {
  positive: ['super', 'excellent', 'bien', 'satisfait', 'merci', 'top', 'rapide', 'parfait'],
  negative: ['nul', 'lent', 'cher', 'problme', 'dǸu', 'retard', 'mauvais', 'pire', 'cassǸ', 'incomplet']
};

const TOPIC_KEYWORDS = {
  price: ['cher', 'prix', 'cot', 'tarif', 'facture'],
  delivery: ['livraison', 'retard', 'colis', 'livreur', 'arrivǸ', 'attente'],
  quality: ['qualitǸ', 'cassǸ', 'fragile', 'solide', 'beau', 'moche'],
  service: ['service', 'support', 'rǸponse', 'conseiller', 'tǸlǸphone']
};

/**
 * Analyse une liste d'observations qualitatives et extrait les signaux.
 */
export function analyzeQualitativeObservations(observations: Observation[]): QualitativeSignal[] {
  const signals: QualitativeSignal[] = [];

  const qualObs = observations.filter(o => o.observation_type === 'qualitative' && o.text);

  for (const obs of qualObs) {
    const text = obs.text!.toLowerCase();
    
    // 1. DǸtection du sentiment (Approche nave)
    let score = 0;
    for (const word of SENTIMENT_KEYWORDS.positive) {
      if (text.includes(word)) score++;
    }
    for (const word of SENTIMENT_KEYWORDS.negative) {
      if (text.includes(word)) score--;
    }
    
    let sentiment: QualitativeSignal['sentiment'] = 'neutral';
    if (score > 0) sentiment = 'positive';
    if (score < 0) sentiment = 'negative';

    // 2. DǸtection des thmes (Topics)
    const topics: string[] = [];
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      if (words.some(w => text.includes(w))) {
        topics.push(topic);
      }
    }

    // 3. DǸtection des problmes clǸs (Issues)
    const issues: string[] = [];
    if (sentiment === 'negative' && topics.includes('price')) issues.push('price_sensitivity');
    if (sentiment === 'negative' && topics.includes('delivery')) issues.push('delivery_delay');

    signals.push({
      topics,
      sentiment,
      issues,
      confidence: 0.8, // Confiance nǸgociable par l'IA
      original_text: obs.text!
    });
  }

  return signals;
}

/**
 * Agrge les signaux qualitatifs pour dǸgager une tendance globale
 * Ex: "38% des commentaires nǸgatifs parlent du prix"
 */
export function summarizeQualitativeSignals(signals: QualitativeSignal[]) {
  const total = signals.length;
  if (total === 0) return null;

  const negativeSignals = signals.filter(s => s.sentiment === 'negative');
  const priceIssues = negativeSignals.filter(s => s.topics.includes('price')).length;

  return {
    totalAnalyzed: total,
    negativeCount: negativeSignals.length,
    priceSensitivityRatio: negativeSignals.length > 0 ? (priceIssues / negativeSignals.length) * 100 : 0
  };
}
