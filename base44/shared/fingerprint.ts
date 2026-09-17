// Fields that identify a specific IMPORT, not the business content of a
// row: import_id is a fresh id generated for every import run, so a row
// re-imported unchanged got a different import_id, and JSON.stringify (also
// order-sensitive on object keys) turned that into a different fingerprint
// every time. Deduplication across imports — the exact case re-running the
// same file is meant to catch — was therefore a no-op: every re-import
// inserted a full second copy of the file instead of being recognized as a
// duplicate. fingerprint/original_data are themselves provenance metadata
// and must not feed back into the value they're describing.
const VOLATILE_FIELDS = new Set(["import_id", "fingerprint", "original_data"]);

export function generateFingerprint(entityName: string, row: any): string {
  const content: Record<string, any> = {};
  for (const key of Object.keys(row || {}).sort()) {
    if (!VOLATILE_FIELDS.has(key)) content[key] = row[key];
  }
  return `${entityName}:${JSON.stringify(content)}`;
}
