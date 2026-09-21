// src/lib/core/UniversalCommercialOntology.js re-exports ALL_CONCEPTS from
// base44/shared/core/UniversalCommercialOntology.ts, but that file only
// re-exported `Registry` from ./ontology/index.ts (where ALL_CONCEPTS is
// actually defined) - not ALL_CONCEPTS itself. No current frontend file
// imports it, so it was invisible, but the first one that tried would hit a
// hard "does not provide an export named 'ALL_CONCEPTS'" failure.
import test from "node:test";
import assert from "node:assert/strict";

test("UniversalCommercialOntology.ts actually re-exports ALL_CONCEPTS", async () => {
  const mod = await import("../base44/shared/core/UniversalCommercialOntology.ts");

  assert.ok(mod.ALL_CONCEPTS, "ALL_CONCEPTS should be re-exported, not undefined");
  assert.ok(Object.keys(mod.ALL_CONCEPTS).length > 0);
});
