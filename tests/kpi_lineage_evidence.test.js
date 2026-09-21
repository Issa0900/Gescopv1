// buildKpiLineage() derives evidenceTag by comparing `status` against
// KPI_STATUS.VERIFIED/.AVAILABLE/.ESTIMATED/.CONDITIONAL - none of which
// exist on the real KPI_STATUS enum (MEASURED/VALID_ZERO/NOT_MEASURED/
// UNKNOWN/INVALID/NOT_APPLICABLE, semanticTypes.js). Every comparison reads
// as `status === undefined`, so every KPI - however reliably measured -
// falls through to the final "HYPOTHÈSE" branch. This proves the mapping is
// dead code before fixing it, and pins down the intended mapping after.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSrcModule } from "./helpers/bundleSrcModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataLineagePath = path.join(__dirname, "../src/lib/core/dataLineage.js");
const semanticTypesPath = path.join(__dirname, "../src/lib/core/semanticTypes.js");

test("a fully measured KPI is tagged CALCUL, not HYPOTHÈSE", async () => {
  const { buildKpiLineage } = await bundleSrcModule(dataLineagePath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const lineage = buildKpiLineage({
    kpiKey: "revenue",
    name: "Revenu",
    value: 1000,
    unit: "currency",
    formula: "sum(revenue)",
    sources: [],
    status: KPI_STATUS.MEASURED,
  });

  assert.equal(lineage.evidenceTag, "CALCUL");
});

test("a KPI with partial/uncertain deps is tagged INFÉRENCE", async () => {
  const { buildKpiLineage } = await bundleSrcModule(dataLineagePath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const lineage = buildKpiLineage({
    kpiKey: "revenue",
    name: "Revenu",
    value: 1000,
    unit: "currency",
    formula: "sum(revenue)",
    sources: [],
    status: KPI_STATUS.UNKNOWN,
  });

  assert.equal(lineage.evidenceTag, "INFÉRENCE");
});

test("a KPI with no measurable data is tagged HYPOTHÈSE", async () => {
  const { buildKpiLineage } = await bundleSrcModule(dataLineagePath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const lineage = buildKpiLineage({
    kpiKey: "revenue",
    name: "Revenu",
    value: null,
    unit: "currency",
    formula: "sum(revenue)",
    sources: [],
    status: KPI_STATUS.NOT_MEASURED,
  });

  assert.equal(lineage.evidenceTag, "HYPOTHÈSE");
});
