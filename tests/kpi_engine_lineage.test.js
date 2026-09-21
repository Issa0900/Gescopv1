// The typecheck widening (jsconfig.json now covers src/lib) flagged
// kpiEngine.js:220 building a lineage source with a `records` key, while
// `LineageSource` (dataLineage.js) declares `recordCount` — used both by
// dataLineage's own zero-quality check and by its human-readable summary.
// This proves whether that mismatch is a real bug or a harmless rename.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSrcModule } from "./helpers/bundleSrcModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kpiEnginePath = path.join(__dirname, "../src/lib/core/kpiEngine.js");

test("Observation-backed KPI lineage reports the real record count and date range", async () => {
  const { computeKpiBatch } = await bundleSrcModule(kpiEnginePath);

  const records = [
    { observation_type: "metric", concept: "finance.custom_metric", value: 100, confidence: 0.9, date: "2026-01-15" },
    { observation_type: "metric", concept: "finance.custom_metric", value: 200, confidence: 0.9, date: "2026-03-10" },
    { observation_type: "metric", concept: "finance.custom_metric", value: 300, confidence: 0.9, date: "2026-02-01" },
  ];

  const results = computeKpiBatch(["custom_metric"], records, new Map());
  const lineage = results.get("custom_metric");

  assert.equal(lineage.value, 600);
  assert.equal(
    lineage.sources[0].recordCount,
    3,
    "the Observation-based source should expose its record count under the same `recordCount` key every other lineage source uses"
  );
  assert.equal(lineage.sources[0].periodStart, "2026-01-15");
  assert.equal(lineage.sources[0].periodEnd, "2026-03-10");
});
