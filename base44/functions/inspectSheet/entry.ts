import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { normalizeRow } from "../../shared/importUtils.ts";
import { getSchema } from "../../shared/entitySchemas.ts";
import * as XLSX from "npm:xlsx@0.18.5";

/**
 * Maintenance helper.
 * mode "inspect": returns the real headers and first row of each requested sheet.
 * mode "backfill": re-reads a sheet and fills, on records already stored, only the
 * fields that are currently empty — no duplicate rows are ever created.
 */
export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const { file_url, sheets, mode, sheet, entity, key } = await req.json();
  const ab = await (await fetch(file_url)).arrayBuffer();
  const wb = XLSX.read(new Uint8Array(ab), { type: "array" });

  if (mode === "backfill") {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "" }) as any[];
    const schema = getSchema(entity);
    const normalized = rows.map((r) => normalizeRow(entity, r, "", schema?.properties || null));
    const byKey = new Map(normalized.filter((r) => r[key]).map((r) => [String(r[key]), r]));

    const stored: any[] = [];
    let skip = 0;
    while (true) {
      const page = await base44.entities[entity].list("created_date", 500, skip);
      stored.push(...page);
      if (page.length < 500) break;
      skip += 500;
    }

    const updates: any[] = [];
    const filled: Record<string, number> = {};
    for (const rec of stored) {
      const src = byKey.get(String(rec[key]));
      if (!src) continue;
      const patch: any = {};
      for (const [f, v] of Object.entries(src)) {
        if (f === key || f === "import_id" || v === "" || v === null || v === undefined) continue;
        const cur = rec[f];
        if (cur === null || cur === undefined || cur === "") {
          patch[f] = v;
          filled[f] = (filled[f] || 0) + 1;
        }
      }
      if (Object.keys(patch).length > 0) updates.push({ id: rec.id, ...patch });
    }

    for (let i = 0; i < updates.length; i += 200) {
      await base44.entities[entity].bulkUpdate(updates.slice(i, i + 200));
    }
    return Response.json({ entity, sheet, stored: stored.length, updated: updates.length, fields_filled: filled });
  }

  const out: Record<string, any> = { sheet_names: wb.SheetNames };
  for (const s of sheets || wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: "" }) as any[];
    out[s] = { rows: rows.length, headers: Object.keys(rows[0] || {}), sample: rows[0] };
  }
  return Response.json(out);
}