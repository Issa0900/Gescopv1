// 18 call sites across 7 pages call `qc.invalidateQueries(["some-key"])` -
// the React Query v4 array-shorthand, removed in v5 (package.json pins
// ^5.84.1). TypeScript flags this (TS2559: 'string[]' has no properties in
// common with InvalidateQueryFilters). At runtime it doesn't throw - an
// array has no `queryKey` property, so QueryClient reads it as an *empty*
// filter, which matches every query in the cache. Instead of invalidating
// just "alerts-all" after marking an alert read, it invalidates the whole
// app's query cache. This test proves that difference against the real
// @tanstack/query-core QueryClient, then each call site is fixed to the v5
// object form: `invalidateQueries({ queryKey: ["some-key"] })`.
import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/query-core";

function seededClient() {
  const qc = new QueryClient();
  qc.setQueryData(["alerts-all"], "A");
  qc.setQueryData(["alerts-unread"], "B");
  qc.setQueryData(["unrelated-page-data"], "C");
  return qc;
}

function invalidatedKeys(qc) {
  return qc
    .getQueryCache()
    .findAll()
    .filter((q) => q.state.isInvalidated)
    .map((q) => q.queryKey[0]);
}

test("the v4 array shorthand invalidates the entire cache, not just the named key", () => {
  const qc = seededClient();
  qc.invalidateQueries(["alerts-all"]);
  assert.deepEqual(invalidatedKeys(qc).sort(), ["alerts-all", "alerts-unread", "unrelated-page-data"]);
});

test("the v5 { queryKey } form invalidates only the named query", () => {
  const qc = seededClient();
  qc.invalidateQueries({ queryKey: ["alerts-all"] });
  assert.deepEqual(invalidatedKeys(qc), ["alerts-all"]);
});
