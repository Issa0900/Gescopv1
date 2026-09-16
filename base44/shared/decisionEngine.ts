/**
 * GESCOP - AI Decision Engine
 * 
 * Phase 6 du Pipeline d'Intelligence
 * Rle : Point d'entrǸe sǸcurisǸ pour le LLM. Il structure le contexte (Evidences, KPIs, Signaux)
 * et formate la rǸponse sous forme d'actions claires (Classification d'Insight).
 */

import { InsightWithEvidence } from './evidenceEngine.ts';

export type AIResponseClass = 'FACT' | 'CALCULATION' | 'OBSERVATION' | 'INFERENCE' | 'HYPOTHESIS' | 'RECOMMENDATION';

export type StructuredAIDecision = {
  classification: AIResponseClass;
  text: string;
  confidence: number;
  based_on: InsightWithEvidence[];
};

/**
 * Wrapper simulant la prǸparation du prompt pour le LLM.
 * Le LLM reoit ces donnǸes structurǸes et retourne un objet `StructuredAIDecision`.
 */
export function prepareDecisionContext(
  question: string,
  insights: InsightWithEvidence[]
): any {
  return {
    system_prompt: "You are GESCOP AI. Base your answers ONLY on the provided evidence.",
    user_intent: question,
    facts: insights.filter(i => i.evidence.some(e => e.type === 'quantitative')),
    qualitative_signals: insights.filter(i => i.evidence.some(e => e.type === 'qualitative')),
    external_signals: insights.filter(i => i.evidence.some(e => e.type === 'external')),
    limitations: "Do not state causality unless supported by an external event and qualitative consensus."
  };
}

/**
 * Parse la rǸponse du LLM (mock) pour s'assurer qu'elle respecte le format dǸcisionnel.
 */
export function parseDecisionResponse(llmOutput: any): StructuredAIDecision {
  // En production, valider le JSON renvoyǸ par le LLM
  return {
    classification: llmOutput.classification || 'INFERENCE',
    text: llmOutput.text || 'Analyse en cours...',
    confidence: llmOutput.confidence || 0.5,
    based_on: llmOutput.based_on || []
  };
}
