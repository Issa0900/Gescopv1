// Resilient bulk insert for imports.
// A single malformed row makes a whole bulkCreate batch fail; retrying such a
// batch row-by-row costs one request per row and blew the function's time limit
// on large sheets. Instead we split the failing batch in half recursively and
// stop after too many rejections, so a bad sheet degrades instead of hanging.
// Rate-limit errors are NOT data errors: those are waited out and retried, never
// counted as rejected rows.

const BATCH = 200;
const MIN_SPLIT = 20;
const MAX_ERRORS = 40;
// Rate limits here are expressed per MINUTE, so the retry budget has to span a
// minute. The old schedule (6 tries, capped at 8s) gave up after ~23s and
// quarantined every remaining row: a 500-row file could come back 0 imported.
// This one waits ~2 minutes in total before conceding.
const MAX_RETRIES = 8;
const MAX_BACKOFF_MS = 30000;

export function missingRequired(row: Record<string, any>, required: string[]): string[] {
  return (required || []).filter((f) => row[f] === undefined || row[f] === null || row[f] === "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(e: any): boolean {
  const msg = String(e?.message || e || "").toLowerCase();
  return e?.status === 429 || msg.includes("rate limit") || msg.includes("too many requests");
}

/** Runs `fn`, waiting out rate limits with exponential backoff. */
async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      if (!isRateLimit(e) || attempt >= MAX_RETRIES) throw e;
      // Full jitter: several batches backing off in lockstep would otherwise
      // retry at the same instant and trip the limit again together.
      const ceiling = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, attempt));
      await sleep(ceiling / 2 + Math.random() * (ceiling / 2));
      attempt++;
    }
  }
}

export async function insertRows(
  base44: any,
  entityName: string,
  rows: Record<string, any>[],
): Promise<{ created: number; quarantined: number; errors: string[] }> {
  let created = 0;
  let quarantined = 0;
  const errors: string[] = [];
  let aborted = false;

  const push = async (batch: Record<string, any>[]) => {
    if (batch.length === 0) return;
    if (aborted) { quarantined += batch.length; return; }
    try {
      await withBackoff(() => base44.entities[entityName].bulkCreate(batch));
      created += batch.length;
    } catch (e: any) {
      // Still rate-limited after all retries: stop instead of burning requests.
      if (isRateLimit(e)) {
        aborted = true;
        quarantined += batch.length;
        if (errors.length < 5) {
          errors.push(
            "limite de débit atteinte après plusieurs tentatives — aucune ligne de ce fichier n'a été perdue, "
            + "elles sont simplement non importées. Attendez une minute puis relancez l'import de ce seul fichier.",
          );
        }
        return;
      }
      if (batch.length > MIN_SPLIT) {
        const mid = Math.floor(batch.length / 2);
        await push(batch.slice(0, mid));
        await push(batch.slice(mid));
        return;
      }
      // Small batch: isolate the offending rows one by one.
      for (const row of batch) {
        if (aborted) { quarantined += 1; continue; }
        try {
          await withBackoff(() => base44.entities[entityName].create(row));
          created += 1;
        } catch (err: any) {
          quarantined += 1;
          if (isRateLimit(err)) {
            aborted = true;
            if (errors.length < 5) errors.push("limite de débit atteinte — réessayez l'import dans une minute");
            continue;
          }
          if (errors.length < 5) errors.push(String(err?.message || e?.message || "rejet"));
          if (errors.length >= 5 && quarantined > MAX_ERRORS) aborted = true;
        }
      }
    }
  };

  for (let i = 0; i < rows.length; i += BATCH) {
    await push(rows.slice(i, i + BATCH));
    if (aborted) break;
    await sleep(150);
  }

  if (aborted) {
    // Rows never attempted after an abort are still unimported.
    const attempted = created + quarantined;
    if (attempted < rows.length) quarantined += rows.length - attempted;
  }

  return { created, quarantined, errors };
}