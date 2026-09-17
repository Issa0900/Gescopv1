// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - Duplicate Import Detector
// ─────────────────────────────────────────────────────────────────────────────
//
// Detects potentially duplicated imports by comparing:
//   1. File-level hash (exact duplicate)
//   2. Row-level hash (partial duplicates)
//   3. Period + entity overlap (same data different file)
//
// Integrates into the import pipeline before bulk insertion.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a simple hash string for a row (deterministic, no crypto needed).
 *
 * Uses a subset of the row's values sorted by key to produce a consistent
 * fingerprint. Not cryptographically secure - just needs to detect identical rows.
 *
 * @param {Object} row - A record object
 * @param {string[]} [keyFields] - Optional subset of fields to hash (default: all)
 * @returns {string} Hash string
 */
export function hashRow(row, keyFields = null) {
  if (!row) return "";
  const fields = keyFields || Object.keys(row).sort();
  const parts = fields.map((k) => {
    const v = row[k];
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim().toLowerCase();
    return String(v);
  });
  // Simple FNV-like hash for performance
  return _simpleHash(parts.join("|"));
}

/**
 * Compute a hash for an entire file's content (array of rows).
 *
 * @param {Array<Object>} rows
 * @param {string[]} [keyFields]
 * @returns {string}
 */
export function hashFile(rows, keyFields = null) {
  if (!rows || rows.length === 0) return "";
  const rowHashes = rows.map((r) => hashRow(r, keyFields));
  return _simpleHash(rowHashes.join("\n"));
}

/**
 * Detect duplicate rows within a single dataset.
 *
 * @param {Array<Object>} rows
 * @param {string[]} [keyFields] - Fields that define uniqueness (e.g., ['order_id'])
 * @returns {{ duplicateCount: number, duplicateIndices: number[][], uniqueCount: number }}
 */
export function detectInternalDuplicates(rows, keyFields = null) {
  if (!rows || rows.length === 0) {
    return { duplicateCount: 0, duplicateIndices: [], uniqueCount: 0 };
  }

  const hashMap = new Map(); // hash → [indices]

  for (let i = 0; i < rows.length; i++) {
    const hash = hashRow(rows[i], keyFields);
    if (!hashMap.has(hash)) {
      hashMap.set(hash, []);
    }
    hashMap.get(hash).push(i);
  }

  const duplicateIndices = [];
  let duplicateCount = 0;

  for (const [, indices] of hashMap) {
    if (indices.length > 1) {
      duplicateIndices.push(indices);
      duplicateCount += indices.length - 1; // first occurrence is not a duplicate
    }
  }

  return {
    duplicateCount,
    duplicateIndices,
    uniqueCount: hashMap.size,
  };
}

/**
 * Check if an import potentially duplicates existing data.
 *
 * @param {Object} params
 * @param {string} params.fileHash - Hash of the incoming file
 * @param {string} params.entityType - Target entity
 * @param {string} [params.periodStart] - Earliest date in the incoming data
 * @param {string} [params.periodEnd] - Latest date in the incoming data
 * @param {Array<Object>} params.existingImports - Previous Import entity records
 * @returns {DuplicateCheckResult}
 */
export function checkImportDuplicate({
  fileHash,
  entityType,
  periodStart = null,
  periodEnd = null,
  existingImports = [],
}) {
  const warnings = [];
  let isDuplicate = false;
  let confidence = 0;
  let matchedImport = null;

  for (const imp of existingImports) {
    // Check exact file hash match
    if (imp.fileHash && imp.fileHash === fileHash) {
      isDuplicate = true;
      confidence = 1.0;
      matchedImport = imp;
      warnings.push(
        `Import identique détecté : fichier « ${imp.file_name} » importé le ${imp.created_date || "date inconnue"}.`
      );
      break;
    }

    // Check same entity + overlapping period
    if (imp.entity_type === entityType && periodStart && periodEnd) {
      const impPeriod = _extractImportPeriod(imp);
      if (impPeriod && _periodsOverlap(periodStart, periodEnd, impPeriod.start, impPeriod.end)) {
        confidence = Math.max(confidence, 0.7);
        matchedImport = matchedImport || imp;
        warnings.push(
          `Chevauchement de période avec l'import « ${imp.file_name} » (${impPeriod.start} → ${impPeriod.end}).`
        );
      }
    }
  }

  return {
    isDuplicate,
    confidence,
    matchedImport,
    warnings,
    suggestion: isDuplicate
      ? "Ce fichier semble avoir déjà été importé. Vérifiez avant de continuer."
      : warnings.length > 0
        ? "Chevauchement de période détecté. Les données pourraient être partiellement dupliquées."
        : null,
  };
}

/**
 * Detect date range of incoming data.
 *
 * @param {Array<Object>} rows
 * @param {string} [dateField='date']
 * @returns {{ start: string|null, end: string|null }}
 */
export function detectPeriod(rows, dateField = "date") {
  if (!rows || rows.length === 0) return { start: null, end: null };

  const dates = rows
    .map((r) => r[dateField])
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (dates.length === 0) return { start: null, end: null };

  return {
    start: dates[0].toISOString().slice(0, 10),
    end: dates[dates.length - 1].toISOString().slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple non-cryptographic hash for strings. FNV-1a inspired.
 * @param {string} str
 * @returns {string}
 */
function _simpleHash(str) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, unsigned
  }
  return hash.toString(36);
}

function _extractImportPeriod(imp) {
  // Try to extract period from the import metadata
  if (imp.period_start && imp.period_end) {
    return { start: imp.period_start, end: imp.period_end };
  }
  // Fallback: use created_date as rough indicator
  return null;
}

function _periodsOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}
