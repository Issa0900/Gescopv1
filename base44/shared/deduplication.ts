import { generateFingerprint } from "./fingerprint.ts";

export async function deduplicateRows(base44: any, entityName: string, rows: any[]) {
  if (rows.length === 0) return { newRows: [], duplicateCount: 0, conflicts: 0, newCount: 0 };
  
  // 1. Generate fingerprints
  const withFp = rows.map(r => ({ ...r, fingerprint: generateFingerprint(entityName, r) }));

  // 2. Fetch all existing fingerprints for deduplication
  // To avoid N^2 queries, we bulk fetch existing fingerprints. Base44 list() caps at 500.
  const existingFingerprints = new Set<string>();
  let page = 0;
  while (true) {
    const batch = await base44.entities[entityName].list("-created_date", 500, page * 500);
    if (!batch || batch.length === 0) break;
    batch.forEach((b: any) => {
      const fp = b.fingerprint || generateFingerprint(entityName, b);
      if (fp) existingFingerprints.add(fp);
    });
    if (batch.length < 500) break;
    page++;
    if (page > 500) break; // Supports up to 250,000 rows
  }

  const newRows: any[] = [];
  let duplicateCount = 0;

  for (const r of withFp) {
    if (existingFingerprints.has(r.fingerprint)) {
      duplicateCount++;
    } else {
      newRows.push(r);
      // Pre-add to prevent duplicates within the SAME import file
      existingFingerprints.add(r.fingerprint);
    }
  }

  return { newRows, duplicateCount, conflicts: 0, newCount: newRows.length };
}
