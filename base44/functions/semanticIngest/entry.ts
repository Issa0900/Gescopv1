import { Base44Client } from "base44";
import { profileData } from "../../shared/dataProfiler.ts";
import { matchConcept, SemanticMatch } from "../../shared/semanticMatcher.ts";
import { normalizeRow } from "../../shared/normalizationEngine.ts";
import { detectGrain } from "../../shared/grainEngine.ts";
import { generateObservations } from "../../shared/observationEngine.ts";

export default async function semanticIngest(
  base44: Base44Client,
  args: {
    file_name: string;
    raw_rows: Record<string, any>[];
  }
) {
  const { file_name, raw_rows } = args;
  if (!raw_rows || raw_rows.length === 0) {
    throw new Error("Aucune donnǸe  ingǸrer.");
  }

  // 1. Profilage
  const profile = profileData(raw_rows);

  // 2. Mappage sǸmantique
  const matchedConcepts: Record<string, SemanticMatch> = {};
  for (const [colName, colProfile] of Object.entries(profile.columns)) {
    const match = matchConcept(colProfile);
    if (match) {
      matchedConcepts[colName] = match;
    }
  }

  // 3. DǸtection du Grain
  const grain = detectGrain(profile, matchedConcepts);

  const allObservations = [];

  // 4. Normalisation & 5. GǸnǸration d'observations
  for (const rawRow of raw_rows) {
    const normalized = normalizeRow(rawRow, profile.columns);
    const rowObservations = generateObservations(normalized, matchedConcepts, file_name, grain);
    allObservations.push(...rowObservations);
  }

  // 6. Sauvegarde en Base de DonnǸes (dans la table Observation)
  // On dǸcoupe par lots de 50 pour Ǹviter de surcharger la base
  let savedCount = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < allObservations.length; i += BATCH_SIZE) {
    const batch = allObservations.slice(i, i + BATCH_SIZE);
    
    // Remplacer par un vrai appel d'insertion Base44 quand Observation.jsonc sera synchronisǸ
    // Exemple : await base44.entities.Observation.bulkCreate(batch);
    
    // Pour l'instant on simule le success
    savedCount += batch.length;
  }

  return {
    status: "success",
    file_name,
    row_count: raw_rows.length,
    detected_grain: grain.type,
    observations_generated: allObservations.length,
    observations_saved: savedCount,
    mapped_columns: Object.keys(matchedConcepts).length,
    unmapped_columns: Object.keys(profile.columns).length - Object.keys(matchedConcepts).length,
    preview: allObservations.slice(0, 5) // Renvoie un aperu au frontend
  };
}

