import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";
import { normalizeRow } from "../../shared/importUtils.ts";
import { fetchDelimitedRows } from "../../shared/csvParse.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { file_url, source_type, file_name } = body;
    if (!file_url || !source_type) {
      return Response.json({ error: "file_url et source_type requis" }, { status: 400 });
    }

    // Create the import record (en cours)
    const importRec = await base44.entities.Import.create({
      source_type,
      file_name: file_name || "import",
      file_url,
      entity_type: "Transaction",
      status: "en_cours",
      rows_processed: 0,
      rows_quarantined: 0,
    });

    // CSV/TSV: parse literally — AI extraction truncates long files.
    let rows = [];
    if (["csv", "tsv"].includes((source_type || "").toLowerCase())) {
      rows = await fetchDelimitedRows(file_url);
    }

    // Other formats: AI extraction
    const extraction = rows.length > 0 ? null : await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            description: { type: "string" },
            amount: { type: "number" },
            type: { type: "string" },
            category: { type: "string" },
            client: { type: "string" },
            product: { type: "string" },
          },
        },
      },
    });

    if (extraction && extraction.status === "success" && extraction.output) {
      const out = extraction.output;
      if (Array.isArray(out)) {
        rows = out;
      } else if (out.transactions && Array.isArray(out.transactions)) {
        rows = out.transactions;
      } else if (Array.isArray(Object.values(out)[0])) {
        rows = Object.values(out)[0];
      }
    }

    // Normalize and create transactions
    const toCreate = [];
    let quarantined = 0;
    rows.forEach((r) => {
      const normalized = normalizeRow("Transaction", r, importRec.id, null, source_type);
      if (!normalized.date || isNaN(normalized.amount)) {
        quarantined++;
        return;
      }
      toCreate.push(normalized);
    });

    let created = 0;
    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += 200) {
        const batch = toCreate.slice(i, i + 200);
        await base44.entities.Transaction.bulkCreate(batch);
        created += batch.length;
      }
    }

    const quality = rows.length > 0 ? Math.round(((rows.length - quarantined) / rows.length) * 100) : 0;
    await base44.entities.Import.update(importRec.id, {
      status: created > 0 ? "complete" : "echoue",
      quality_score: quality,
      rows_processed: created,
      rows_quarantined: quarantined,
    });

    return Response.json({
      import_id: importRec.id,
      rows_received: rows.length,
      rows_imported: created,
      rows_quarantined: quarantined,
      quality_score: quality,
      status: created > 0 ? "complete" : "echoue",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
