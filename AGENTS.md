# ⚠️ CRITICAL DIRECTIVE FOR ALL AI AGENTS ⚠️
**Before doing ANY work on this codebase, you MUST read and understand the OVERARCHING GOAL below.**
Failure to do so will result in localized fixes that break the global vision.

## 🎯 OVERARCHING GOAL (THE "NORTH STAR")
The ultimate objective of GESCOP is to be a **Universal, Holistic AI Decision-Support System (Outil d'Aide à la Décision Éclairée)**.
It must be functionally resilient and capable of digesting ANY type of user data (e.g., standard Excel files, legacy ERP exports, international Kaggle datasets in English) — never blocking the user on trivial formatting issues, maximizing data ingestion, translating on the fly.
It must go beyond standard Business Intelligence by fusing three distinct pillars of data:
1. **Quantitative Data** (Internal metrics: Finance, Sales, Inventory, universal CSV/Kaggle imports).
2. **Qualitative Data** (Internal context: Customer feedback, employee sentiment, interactions).
3. **External Signals** (Macro context: Government regulations, economic trends, market news, competitor moves).

The system's core purpose is to **cross-analyze these dimensions to generate enlightened, strategic decisions**. Never restrict the system to mere data visualization; it must always connect the dots between raw numbers, human feedback, and the outside world to guide the user.

---

## 🎼 ORCHESTRAL AGENT FRAMEWORK
This project is maintained by a swarm of specialized AI experts. When you (the generative AI) are invoked, you must act as an Orchestrator and delegate/adopt the following expert personas as needed:

### 1. 🗄️ The Data Engineer (Universal Ingestion Expert)
- **Role**: Ensures data pipelines never crash and can ingest any format.
- **Rules**:
  - **Universal Support**: Anticipate Kaggle datasets and English terminology.
  - **Robust Enum Translation**: Use `base44/shared/importUtils.ts` (`ENUM_TRANSLATIONS`) to translate terms (e.g., "active" -> "actif", "low" -> "faible", "received" -> "recu") seamlessly. Never hardcode strict exact-match validations without English fallbacks.
  - **Fail Gracefully**: If a value is unknown, map to a default or quarantine cleanly. Preserve as much data as possible to facilitate decision-making.

### 2. 📊 The Financial & BI Analyst (Decision-Making Expert)
- **Role**: Ensures KPIs and metrics are mathematically sound and business-relevant.
- **Rules**: Ensure all KPIs in `src/lib/core/kpiRegistry.js` calculate correctly, handle division by zero, and provide actionable context. Always verify that cross-domain indicators (e.g., CAC, ROAS) have the underlying data they need.

### 3. 🎨 The UI/UX Architect (Frontend Expert)
- **Role**: Ensures the React/Vite interface is responsive, crash-proof, and intuitive.
- **Rules**: Catch React rendering errors. Ensure `framer-motion` fallbacks (e.g., `fake-framer-motion.jsx`) cover all semantic HTML tags (`section`, `article`, `header`, etc.) to prevent `Minified React Error #130`.

### 4. 🛠️ The DevOps / QA Engineer (Deployment Expert)
- **Role**: Ensures smooth testing and deployment to Base44.
- **Rules**: Always verify `npm run typecheck` and `npm run lint`. Use Playwright for E2E tests (`npx playwright test`). Use `npm run deploy` (which wraps `npx base44 build && npx base44 deploy --yes`) to push changes to production.

---

## 📌 ACTUAL PIPELINE STATUS (Audit — 16 September 2026)

`memory_journal.md` (local, gitignored) claims 6+ "engines" were built and integrated on 16 Sept 2026. A code audit that same day found a real, non-trivial gap between **code written** and **feature delivered**. This section is the source of truth until the gaps below are closed — read it before assuming any of these pipelines "just work".

**✅ Actually wired end-to-end (ingestion → storage → UI):**
- The Phase 1 quintet — `dataProfiler.ts` → `semanticMatcher.ts` → `grainEngine.ts` → `normalizationEngine.ts` → `observationEngine.ts` (all in `base44/shared/`) — is genuinely called from `base44/functions/importMultiData/entry.ts` (the real production import route) and writes real rows to the `Observation` entity via `base44.entities.Observation.bulkCreate`.
- `Observation` records are genuinely consumed by `src/lib/core/kpiEngine.js` and surfaced in `src/pages/Kpis.jsx`, `Rapports.jsx`, `Alertes.jsx`, `Insights.jsx`, `Dashboard.jsx`, `src/components/insights/InsightCard.jsx`, and the hooks `useObservations.js` / `useKpiEngine.js`. The quantitative pillar is real, not just scaffolding.

**⚠️ Called, but the output is thrown away (not actually delivering the "fusion" promised by the North Star):**
- `base44/functions/analyzeBusiness/entry.ts` (lines ~16-18) computes `qualSignals` (via `qualitativeEngine.ts`) and `contextGraph` (via `contextEngine.ts`) from real `Observation` data — but **never uses either result** in the LLM prompt built right after (the prompt only uses the older `buildBusinessContext` output). Fix this before claiming the qualitative/external fusion is live; right now it's dead computation.

**❌ Written but orphaned — zero callers in `base44/` or `src/` outside the file itself (verified by grep):**
- `base44/shared/decisionEngine.ts` and `base44/shared/evidenceEngine.ts` (Phase 6). Their own comments admit they are LLM-call *simulations* ("Wrapper simulant...", "En production, valider le JSON renvoyé..."), never wired to a real model call.
- `base44/shared/externalSignalEngine.ts` (Phase 4).
- `base44/shared/quantitativeEngine.ts` (Phase 2) — its only caller is a root-level ad hoc script (`test_e2e_pipeline.ts`), which is not part of `tests/`, not run by any npm script, and not run in CI.
- `base44/functions/semanticIngest/` is a **test-only, isolated route**, not called by the frontend, and it currently *simulates* the DB write instead of doing it — do not confuse it with `importMultiData`, which is the real production path.

**🐛 Known concrete bugs — fix before building on top of this:**
- ~~`entry.ts:11` dangling `semanticEngine.ts` import~~ — **resolved**, no longer present (verified by grep, 18 Sept 2026).
- ~~`results.push({...})` duplicate `apercu`/`rows_read` keys~~ — **resolved**, no longer present (verified by grep, 18 Sept 2026).
- `src/lib/core/kpiRegistry.js` ratio KPIs returning `0` instead of `null` on missing data — **partially resolved 18 Sept 2026** for `payroll_total`, `rh_expense_ratio`, `revenue_per_employee`, `net_burn_rate` (+ the runway calc that consumes `net_burn_rate`, which had a second bug: `null >= 0` evaluates `true` in JS, so a genuinely unmeasured burn rate read as "profitable, infinite runway"). `gross_margin_pct`/`net_margin_pct` were checked and are already correct (this bullet was stale on those two).
- ~~`jsconfig.json` excludes `src/lib`, `src/api`, and never includes any of `base44/`~~ — **fully resolved 18 Sept 2026.** `include` now covers `src/lib/**/*.js`, `src/api/**/*.js`, and `src/components/**/*.jsx` (previously only `.js`, silently missing every JSX component); `src/components/ui` exclude glob fixed to `src/components/ui/**` (the bare directory name wasn't matching, so those files were still being typechecked as root files despite the intent to exclude them); added `noEmit`/`allowImportingTsExtensions` (required together) and `types: ["vite/client"]` (fixes `import.meta.env`). `npm run typecheck` went from 483 errors on this widened scope down to **0**, by fixing real root causes across a dozen-plus commits, not by suppressing — every behavior-changing fix is backed by a real failing-then-passing test (`tests/*.test.js`, using an esbuild-bundling helper for `src/lib/core`'s Vite-only extensionless imports since Node's test runner can't resolve those directly). Real bugs found and fixed along the way, not just type annotations:
  - `Import.jsx` called `base44.integrations.Core.UploadPublicFile` — not a real method on the SDK (only `UploadFile` exists, identical `{file}`→`{file_url}` signature). The integrations client is a dynamic Proxy that forwards any method name to a server call instead of throwing client-side, so every file upload on the Import page was silently hitting a nonexistent endpoint. This is the single upload step every import in the app depends on.
  - `kpiEngine.js`'s Observation-based lineage source used `records:` instead of `recordCount:` (the key every other `LineageSource` uses) and never computed period dates — broke quality warnings and lineage text for the one pipeline that's actually wired end-to-end (the Phase 1-2 quintet).
  - `dataLineage.js`'s `evidenceTag`/warnings logic compared `status` against `KPI_STATUS.VERIFIED`/`.AVAILABLE`/`.ESTIMATED`/`.CONDITIONAL` — none of which exist on the real enum (`MEASURED`/`VALID_ZERO`/`NOT_MEASURED`/`UNKNOWN`/`INVALID`/`NOT_APPLICABLE`). Every comparison was `status === undefined`, so every KPI, however reliable, was tagged "HYPOTHÈSE".
  - `kpiValidator.js`'s `validateKpiForDisplay()` had the same phantom-status bug (`.UNAVAILABLE`/`.ESTIMATED`/`.REVIEW`) — a KPI with zero available data was never actually flagged unsafe to display.
  - `compatibilityEngine.js` checked `dataType === DATA_TYPES.RATE`/`.RATIO` and `temporalType === TEMPORAL_TYPES.BALANCE`, but RATE/RATIO/BALANCE are `ECONOMIC_ROLES` values — the specific "rates can't be summed" / "mixing flows and balances" messages never fired (compositions were still blocked via `isAdditive`, just with a useless generic reason).
  - `base44/shared/core/ontology/domains/sales.ts` had `es`/`pt`/`de`/`it`/`nl` synonym keys duplicated in `SALES_CONCEPTS["sales.revenue.net"]` — the second set silently overwrote the first at runtime, discarding valid synonym terms.
  - 18 call sites across 7 pages called `qc.invalidateQueries(["key"])` — the React Query v4 array shorthand, removed in v5 (`package.json` pins `^5.84.1`). It doesn't throw: an array has no `queryKey` property, so `QueryClient` read it as an empty filter matching *every* query in the cache. Marking one alert read was invalidating the app's entire query cache instead of just `alerts-all`. Fixed to the v5 `{ queryKey: [...] }` form everywhere.
  - `base44/shared/core/UniversalCommercialOntology.ts` only re-exported `Registry` from `./ontology/index.ts`, not `ALL_CONCEPTS` (also defined there) — but `src/lib/core/UniversalCommercialOntology.js` re-exports `ALL_CONCEPTS` as if it existed. No current frontend file imports it, so it was invisible; the first one that tried would have hit a hard "does not provide an export" failure.
  - `Parametres.jsx` was still passing `form`/`setForm` into `StrategicGoalsPanel`/`KpiManagementPanel`/`UsersAccessPanel` — all three take zero props since their Phase 3/4 rewrites earlier this pass (they fetch their own data now) — and into `UnderstandingPanel`, which declared an unused `company` prop never read in its body. Dead code left over from before those rewrites, cleaned up.
  Everything else was a genuine type-annotation gap with no behavior change: a missing `@typedef {Object} FieldSemantic` (referenced across `fieldSemantic.js`/`entityFieldMap.js` but never declared), the shadcn `React.forwardRef` primitives (`button`/`input`/`label`/`select`/`tabs`/`input-otp`/`switch`/`textarea`) whose JSDoc `@param` blocks were attached to the outer `const X = React.forwardRef(...)` statement instead of the inner function expression — TS silently ignores JSDoc on the wrong node, so every consumer saw an inferred `{}` props type — plus missing/incorrect optional-prop JSDoc on around fifteen page and dashboard components (`EmptyState`, `StatCard`, `PriorityBadge`, `Badge`, `AuthLayout`, `DataErrorState`, `ActionCard`, `ForecastCard`, `KpiOverview`, `DecisionCard`, `ImportProgress`, several recharts tooltip components, `SliderControl`, `RadarScanButton`).
- ~~Mojibake in `base44/shared/*.ts` comments~~ — **checked and closed 18 Sept 2026, no fix needed.** A byte-level scan of all 71 `.ts` files under `base44/` (grep for the double-encoded UTF-8 signature `0xC3 0x83`/`0xC3 0x82`, plus a text-level scan for common mojibake substrings like `Ã©`, `â€™`, `�`) found zero occurrences anywhere, including the specific files this note used to list (`dataProfiler.ts`, `semanticMatcher.ts`, `normalizationEngine.ts`, `grainEngine.ts`, `observationEngine.ts`, `quantitativeEngine.ts`, `qualitativeEngine.ts`, `externalSignalEngine.ts`, `contextEngine.ts`, `decisionEngine.ts`, `evidenceEngine.ts`, `importUtils.ts`, `semanticIngest/entry.ts`). The only non-ASCII hits in those files are legitimate `€`/`£`/`$` currency symbols inside regexes (`dataProfiler.ts:75,96`, `importUtils.ts:1784,1791`) — correctly encoded, not corrupted. This note had carried forward unverified ("assume still true") since at least one earlier audit pass; it no longer reflects reality and is closed rather than left to keep resurfacing as phantom debt.

**🪞 New this pass (18 Sept 2026) — duplicated systems that silently drift apart:**
- ~~Two KPI engines exist~~ — **resolved 18 Sept 2026.** `src/components/settings/KpiManagementPanel.jsx` was rewritten to compute real eligibility from `src/lib/core/kpiRegistry.js` + `useKpiEngine` (fetches the same entities as `Kpis.jsx`, classifies every KPI by its actual `KPI_STATUS`) instead of the hardcoded demo classification from `base44/shared/core/kpi/*`. That folder (9 files, ~1550 lines — `kpiCatalog.ts`, `kpiDependencyGraph.ts`, `kpiDiscovery.ts`, `kpiEligibility.ts`, `kpiRecommendation.ts`, `metricEngine.ts`, `DataIntelligenceOrchestrator.ts`, `types.ts`, `index.ts`) **was deleted outright** once its only consumer was replaced — confirmed by grep to have zero callers anywhere in `base44/` or `src/`. Its dedicated test file `tests/kpi_intelligence_engine.test.js` was removed with it: that suite validated only this engine's own internals, never the app's actual behavior, so keeping it after the deletion would have meant maintaining tests for code that could never run in production.
- ~~Two objective/goal systems exist~~ — **resolved 18 Sept 2026.** `StrategicGoalsPanel.jsx` now reads/writes the `Goal` entity directly (same source `Decisions.jsx` displays) instead of `Company.strategic_goals`. Any pre-existing `strategic_goals` entries are migrated into real `Goal` records the first time the panel loads, then `Company.strategic_goals` is cleared server-side (not just in local form state) so the migration never repeats. Verified with Playwright: one legacy entry → one `Goal.create()` call with numbers correctly parsed out of formatted strings ("42.0%" → 42) and priority normalized to the enum ("Élevée" → "elevee"); a second page visit creates nothing further.
- **`Company.company_dictionary`** (edited via `src/components/settings/DictionaryPanel.jsx`, which explicitly promises "chaque correction... automatiquement enregistrée ici et réutilisée pour tous les futurs fichiers") is **never read anywhere in `base44/`** — confirmed by grep, zero matches outside the panel and `Parametres.jsx`. The per-company synonym memory this panel promises does not exist yet; wiring it into the import pipeline is Phase 1 of the ongoing "reconnaissance universelle" initiative (see conversation/plan, not yet in a committed doc).
- ~~`KpiManagementPanel.jsx`'s "Ajouter au tableau de bord" button~~ — **removed 18 Sept 2026** along with the rest of the demo UI; the rewritten panel is read-only (eligibility explorer), pinning to the dashboard was never wired to real state and is not part of this fix.

- **Phase 5 done (18 Sept 2026).** `construirePrompt()` (now in `importUtils.ts`, re-exported from `importPlan.ts`) no longer forbids all semantic reasoning: it explicitly permits the AI to match an unnamed required identifier (order_id, campaign_id...) to a column that clearly serves as a per-row reference even when named differently ("transaction_id", "Ref. Vente"), while still forbidding invented field names for everything else. It also receives `Company.company_dictionary` as context so the AI reuses corrections this specific company already made instead of rediscovering them. Threaded through `analyserFichier` → `planPourFeuille` → the request handler in `entry.ts`. Tested for prompt content (dictionary block present/absent, identifier-reasoning exception present, no-dictionary case unchanged) — the actual LLM behavior this produces can only be observed against a live model, not from this sandbox.

Update this section whenever one of these gaps is closed, so it keeps reflecting reality instead of aspiration.

---

## Project Context & Technical Details

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

### Base44 References
- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

### Key Files
- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

### Working Notes
- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.