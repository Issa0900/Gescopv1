// validateKpiForDisplay() compared kpiLineage.status against
// KPI_STATUS.UNAVAILABLE/.ESTIMATED/.REVIEW - none of which exist on the
// real KPI_STATUS enum (semanticTypes.js: MEASURED/VALID_ZERO/NOT_MEASURED/
// UNKNOWN/INVALID/NOT_APPLICABLE). Every comparison was `status ===
// undefined` - dead code that never fired for any real status.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSrcModule } from "./helpers/bundleSrcModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kpiValidatorPath = path.join(__dirname, "../src/lib/core/kpiValidator.js");
const semanticTypesPath = path.join(__dirname, "../src/lib/core/semanticTypes.js");

test("a NOT_MEASURED KPI is flagged unsafe to display", async () => {
  const { validateKpiForDisplay } = await bundleSrcModule(kpiValidatorPath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const result = validateKpiForDisplay({ status: KPI_STATUS.NOT_MEASURED, qualityScore: 100, warnings: [] });

  assert.equal(result.displaySafe, false);
  assert.equal(result.cssClass, "kpi-unavailable");
});

test("an UNKNOWN (partially estimated) KPI is safe to display but warned", async () => {
  const { validateKpiForDisplay } = await bundleSrcModule(kpiValidatorPath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const result = validateKpiForDisplay({ status: KPI_STATUS.UNKNOWN, qualityScore: 100, warnings: [] });

  assert.equal(result.displaySafe, true);
  assert.equal(result.cssClass, "kpi-warning");
  assert.ok(result.warnings.some((w) => w.includes("estimée")));
});

test("a fully MEASURED, high-quality KPI is safe with no extra warnings", async () => {
  const { validateKpiForDisplay } = await bundleSrcModule(kpiValidatorPath);
  const { KPI_STATUS } = await bundleSrcModule(semanticTypesPath);

  const result = validateKpiForDisplay({ status: KPI_STATUS.MEASURED, qualityScore: 100, warnings: [] });

  assert.equal(result.displaySafe, true);
  assert.equal(result.cssClass, "kpi-safe");
  assert.deepEqual(result.warnings, []);
});
