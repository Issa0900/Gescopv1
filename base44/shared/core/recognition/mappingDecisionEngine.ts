// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Mapping Decision Engine & Candidate Generator
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { Registry } from "../ontology/index.ts";
import type { CanonicalConcept, RecognitionResult, CandidateMatch } from "../ontology/types.ts";
import { normalizeHeader } from "./normalizer.ts";
import { tokenizeHeader, generateNGrams } from "./tokenizer.ts";
import { detectLanguage } from "./languageDetector.ts";
import { resolveAbbreviation } from "./abbreviationEngine.ts";
import { findBestFuzzyMatch, stringSimilarity } from "./typoMatcher.ts";
import { profileValues } from "./valueProfiler.ts";
import { extractUnit } from "./unitEngine.ts";
import { analyzeContext, disambiguateGenericAmount } from "./contextEngine.ts";
import { scoreCandidate } from "./scoringEngine.ts";

export interface ColumnRecognitionRequest {
  columnName: string;
  sheetName?: string;
  sampleValues?: unknown[];
  siblingColumns?: string[];
  entityHint?: string;
  mappingMemory?: Array<{
    columnName: string;
    sourceContext: string;
    siblingSignature: string;
    resolvedCanonicalKey: string;
    resolvedSemanticType: string;
    confirmedBy: "user" | "auto";
    confidence: number;
  }>;
}

/**
 * Analyse complète d'une colonne de tableau par l'Ontologie Commerciale Universelle
 */
export function analyzeColumn(request: ColumnRecognitionRequest): RecognitionResult {
  const {
    columnName,
    sheetName = "",
    sampleValues = [],
    siblingColumns = [],
    entityHint,
    mappingMemory = [],
  } = request;

  // 1. Préservation et normalisation
  const normInfo = normalizeHeader(columnName);
  const rawHeader = normInfo.rawHeader;
  const cleanHeader = normInfo.cleanText;

  // 2. Tokenisation intelligente
  const tokens = tokenizeHeader(columnName);
  const nGrams = generateNGrams(tokens, 3);

  // 3. Détection de langue
  const langDetection = detectLanguage([cleanHeader, ...siblingColumns]);
  const language = langDetection.language;

  // 4. Contexte feuille et voisinage des colonnes
  const context = analyzeContext(sheetName, siblingColumns, entityHint);

  // 5. Profilage des valeurs et unités
  const valueProfile = profileValues(sampleValues, cleanHeader);
  const unitInfo = extractUnit(columnName, sampleValues);

  // 6. Vérification Mémoire d'apprentissage utilisateur
  const normColForMem = cleanHeader.replace(/[^a-z0-9]/g, "");
  const memMatch = mappingMemory.find(
    (m) => m.columnName.replace(/[^a-z0-9]/g, "") === normColForMem && m.confidence >= 0.8
  );

  // 7. Résolution d'abréviation
  const abbrevMatch = resolveAbbreviation(columnName, [...tokens, ...siblingColumns]);

  // 8. Génération des candidats
  const candidateScores = new Map<string, CandidateMatch>();
  const evidenceList: string[] = [];

  // A. Candidat issu de l'abréviation
  if (abbrevMatch) {
    const concept = Registry.getConcept(abbrevMatch.conceptId);
    if (concept) {
      const breakdown = scoreCandidate(
        concept.conceptId,
        rawHeader,
        tokens,
        0.9,
        abbrevMatch.confidence,
        context,
        valueProfile,
        unitInfo
      );
      candidateScores.set(concept.conceptId, {
        conceptId: concept.conceptId,
        canonicalName: concept.canonicalName,
        score: breakdown.totalScore,
        confidence: breakdown.confidence,
        justification: abbrevMatch.justification,
      });
      evidenceList.push(...breakdown.evidence);
    }
  }

  // B. Recherche exacte par synonymes / n-grammes
  for (const phrase of [cleanHeader, ...nGrams]) {
    // Si ce n'est pas l'en-tête complet, on n'accepte que les quasi-identiques pour ne pas tronquer des mots clés comme 'index'
    const sim = stringSimilarity(cleanHeader, phrase);
    if (phrase !== cleanHeader && sim < 0.82) {
      continue;
    }

    const matchedConcepts = Registry.findBySynonym(phrase);
    for (const concept of matchedConcepts) {
      if (!candidateScores.has(concept.conceptId)) {
        const breakdown = scoreCandidate(
          concept.conceptId,
          rawHeader,
          tokens,
          sim,
          0.5,
          context,
          valueProfile,
          unitInfo
        );
        candidateScores.set(concept.conceptId, {
          conceptId: concept.conceptId,
          canonicalName: concept.canonicalName,
          score: breakdown.totalScore,
          confidence: breakdown.confidence,
          justification: `Match synonyme exact '${phrase}'.`,
        });
        evidenceList.push(...breakdown.evidence);
      }
    }
  }

  // C. Désambiguïsation spécifique des termes génériques (amount, montant, total, solde)
  const isGeneric = /^(amount|montant|total|valeur|value|solde)$/i.test(cleanHeader);
  if (isGeneric) {
    const disam = disambiguateGenericAmount(cleanHeader, context);
    const concept = Registry.getConcept(disam.resolvedConceptId);
    if (concept) {
      const breakdown = scoreCandidate(
        concept.conceptId,
        rawHeader,
        tokens,
        0.85,
        0.5,
        context,
        valueProfile,
        unitInfo
      );
      candidateScores.set(concept.conceptId, {
        conceptId: concept.conceptId,
        canonicalName: concept.canonicalName,
        score: Math.max(breakdown.totalScore, disam.confidence),
        confidence: Math.max(breakdown.confidence, disam.confidence),
        justification: disam.justification,
      });
      evidenceList.push(disam.justification);
    }
  }

  // D. Match flou / Tolérance aux fautes de frappe si aucun candidat solide
  if (candidateScores.size === 0 || Array.from(candidateScores.values()).every((c) => c.confidence < 0.6)) {
    const allSynonyms: string[] = [];
    const synToConcept = new Map<string, CanonicalConcept>();

    for (const concept of Registry.getAllConcepts()) {
      for (const synList of Object.values(concept.synonyms)) {
        if (Array.isArray(synList)) {
          for (const s of synList) {
            allSynonyms.push(s);
            synToConcept.set(s, concept);
          }
        }
      }
    }

    const fuzzy = findBestFuzzyMatch(cleanHeader, allSynonyms);
    if (fuzzy && synToConcept.has(fuzzy.bestMatch)) {
      const concept = synToConcept.get(fuzzy.bestMatch)!;
      const breakdown = scoreCandidate(
        concept.conceptId,
        rawHeader,
        tokens,
        fuzzy.similarity,
        0.5,
        context,
        valueProfile,
        unitInfo
      );
      candidateScores.set(concept.conceptId, {
        conceptId: concept.conceptId,
        canonicalName: concept.canonicalName,
        score: breakdown.totalScore,
        confidence: breakdown.confidence,
        justification: `Rattrapage faute de frappe : '${cleanHeader}' -> '${fuzzy.bestMatch}' (${Math.round(fuzzy.similarity * 100)}%).`,
      });
      evidenceList.push(`Tolérance aux fautes de frappe : correction '${cleanHeader}' en '${fuzzy.bestMatch}'`);
    }
  }

  // E. Décomposition des termes composés inconnus (Section 65 du rapport)
  // Ex: "customer_value_index" -> "customer" + "value" + "index"
  const hasStrongCandidate = candidateScores.size > 0 && Array.from(candidateScores.values()).some((c) => c.confidence >= 0.70);
  if (!hasStrongCandidate && tokens.length >= 2) {
    const knownTokens: string[] = [];
    for (const t of tokens) {
      if (
        Registry.findBySynonym(t).length > 0 ||
        Registry.findByAbbreviation(t).length > 0 ||
        ["customer", "client", "value", "valeur", "index", "indice", "score", "rate", "cost", "cout", "price", "prix"].includes(t)
      ) {
        knownTokens.push(t);
      }
    }

    if (knownTokens.length >= 2) {
      const compositeName = tokens.join("_");
      evidenceList.push(`Terme composé inconnu décomposé en tokens connus : [${knownTokens.join(", ")}]`);
      return {
        sourceHeader: rawHeader,
        normalizedHeader: cleanHeader,
        language,
        candidates: [
          {
            conceptId: `custom.${compositeName}`,
            canonicalName: compositeName,
            score: 0.63,
            confidence: 0.63,
            justification: `Décomposition en concepts connus [${knownTokens.join(", ")}]. Validation requise.`,
          },
        ],
        selectedConcept: `custom.${compositeName}`,
        canonicalName: compositeName,
        confidence: 0.63,
        evidence: evidenceList,
        nature: "financial_measure",
        logicalType: valueProfile.detectedLogicalType,
        role: "RESULT",
        aggregation: "AVG",
        grain: "customer",
        unit: unitInfo.unitSymbol,
        currency: unitInfo.currencyCode,
        requiresValidation: true,
      };
    }
  }

  // 9. Classement des candidats
  const sortedCandidates = Array.from(candidateScores.values()).sort((a, b) => b.score - a.score);
  const bestCandidate = sortedCandidates[0];

  if (!bestCandidate || bestCandidate.confidence < 0.4) {
    return {
      sourceHeader: rawHeader,
      normalizedHeader: cleanHeader,
      language,
      candidates: sortedCandidates,
      selectedConcept: null,
      canonicalName: null,
      confidence: bestCandidate?.confidence || 0.1,
      evidence: ["Confiance insuffisante ou concept non répertorié."],
      nature: "unknown",
      logicalType: valueProfile.detectedLogicalType,
      role: "unknown",
      aggregation: "NONE",
      grain: "unknown",
      requiresValidation: true,
    };
  }

  const selectedConceptDef = Registry.getConcept(bestCandidate.conceptId);
  const targetEntity = context.inferredEntity || selectedConceptDef?.entityBindings?.[0]?.entity || null;
  const targetField =
    selectedConceptDef?.entityBindings?.find((b) => b.entity === targetEntity)?.field ||
    selectedConceptDef?.entityBindings?.[0]?.field ||
    null;

  // Filtrage des doublons dans les preuves
  const uniqueEvidence = Array.from(new Set(evidenceList));

  return {
    sourceHeader: rawHeader,
    normalizedHeader: cleanHeader,
    language,
    candidates: sortedCandidates,
    selectedConcept: bestCandidate.conceptId,
    canonicalName: bestCandidate.canonicalName,
    confidence: bestCandidate.confidence,
    evidence: uniqueEvidence,
    nature: selectedConceptDef?.nature || "financial_measure",
    logicalType: selectedConceptDef?.logicalType || valueProfile.detectedLogicalType,
    role: selectedConceptDef?.businessRole || "FLOW",
    aggregation: selectedConceptDef?.allowedAggregations[0] || "SUM",
    grain: selectedConceptDef?.grain || "order",
    unit: unitInfo.unitSymbol || selectedConceptDef?.unit,
    currency: unitInfo.currencyCode,
    targetEntity,
    targetField,
    requiresValidation: bestCandidate.confidence < 0.65,
  };
}
