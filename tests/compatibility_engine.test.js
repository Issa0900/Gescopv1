// The typecheck widening flagged compatibilityEngine.js comparing
// `f.dataType === DATA_TYPES.RATE`/`.RATIO` and `temporalType ===
// TEMPORAL_TYPES.BALANCE` - but RATE/RATIO/BALANCE are ECONOMIC_ROLES
// values (semanticTypes.js), not DATA_TYPES or TEMPORAL_TYPES ones. Those
// properties don't exist on the enums being read, so the comparisons are
// always `undefined === real value` - always false. canComposeChart()
// already blocks an actual rate+flow composition (via isAdditive), so this
// doesn't let bad data through, but it means the specific, more useful
// "rates can't be summed" reason/suggestion never surfaces - callers always
// see the generic fallback message instead.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSrcModule } from "./helpers/bundleSrcModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compatibilityEnginePath = path.join(__dirname, "../src/lib/core/compatibilityEngine.js");

function rateField(field, canonicalKey) {
  return {
    source: "Product",
    field,
    canonicalKey,
    semanticType: "unit_price",
    economicRole: "RATE",
    dataType: "currency",
    temporalType: "static",
    isAdditive: false,
    isComparable: true,
    label: { fr: field, en: field },
  };
}

function flowField(field, canonicalKey) {
  return {
    source: "Order",
    field,
    canonicalKey,
    semanticType: "revenue",
    economicRole: "FLOW",
    dataType: "currency",
    temporalType: "flow",
    isAdditive: true,
    isComparable: true,
    label: { fr: field, en: field },
  };
}

test("composing two rate fields explains that rates/ratios can't be summed", async () => {
  const { validateComposition } = await bundleSrcModule(compatibilityEnginePath);

  const result = validateComposition([rateField("unit_price", "unit_price"), rateField("selling_price", "selling_price")]);

  assert.equal(result.valid, false);
  assert.match(result.reason, /taux et ratios ne peuvent pas être sommés/);
});

test("validateAggregation('sum') on a rate field is rejected with 'avg' suggested", async () => {
  const { validateAggregation } = await bundleSrcModule(compatibilityEnginePath);

  const result = validateAggregation(rateField("margin", "margin"), "sum");

  assert.equal(result.valid, false);
  assert.equal(result.suggestedMethod, "avg");
});

test("explainIncompatibility names the rate field as the reason, not a generic message", async () => {
  const { explainIncompatibility } = await bundleSrcModule(compatibilityEnginePath);

  const message = explainIncompatibility(
    { ...rateField("margin", "margin"), name: "Marge" },
    { ...rateField("unit_price", "unit_price"), name: "Prix unitaire" }
  );

  assert.match(message, /taux/);
});
