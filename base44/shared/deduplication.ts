import { generateFingerprint } from "./fingerprint.ts";

export async function deduplicateRows(base44: any, entityName: string, rows: any[]) {
  if (rows.length === 0) return { newRows: [], duplicateCount: 0, conflicts: 0, newCount: 0 };
  
  // 1. Generate fingerprints
  const withFp = rows.map(r => ({ ...r, fingerprint: generateFingerprint(entityName, r) }));

  // 2. Intra-file deduplication (O(N) in-memory, instant)
  const seenFp = new Set<string>();
  const intraDeduped: any[] = [];
  let intraDupes = 0;
  for (const r of withFp) {
    if (r.fingerprint && seenFp.has(r.fingerprint)) {
      intraDupes++;
    } else {
      if (r.fingerprint) seenFp.add(r.fingerprint);
      intraDeduped.push(r);
    }
  }

  // 3. Check existing fingerprints against recent records (max 1000, 1 single fast query)
  const existingFingerprints = new Set<string>();
  try {
    const recent = await base44.entities[entityName].list("-created_date", 1000, 0);
    for (const b of recent || []) {
      const fp = b.fingerprint || generateFingerprint(entityName, b);
      if (fp) existingFingerprints.add(fp);
    }
  } catch {
    // Non-blocking: database read failure shouldn't abort imports
  }

  const newRows: any[] = [];
  let duplicateCount = intraDupes;

  for (const r of intraDeduped) {
    if (r.fingerprint && existingFingerprints.has(r.fingerprint)) {
      duplicateCount++;
    } else {
      newRows.push(r);
      if (r.fingerprint) existingFingerprints.add(r.fingerprint);
    }
  }

  return { newRows, duplicateCount, conflicts: 0, newCount: newRows.length };
}
