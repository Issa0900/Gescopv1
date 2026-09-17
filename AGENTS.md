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
- `base44/functions/importMultiData/entry.ts:11` imports `resolveFieldSemantics` from `../../shared/semanticEngine.ts` — **that file does not exist anywhere in the repo**, and the import is never even used in the file. This is a dangling import in the main production import route; verify whether it currently breaks Deno module resolution before relying on imports working.
- Same file, lines ~404-411: the `results.push({...})` object literal declares `apercu` twice and `rows_read` twice — a leftover from an unreconciled parallel-agent merge (the last value silently wins; the earlier computation is wasted).
- `src/lib/core/kpiRegistry.js` has several ratio/ratio-like KPIs (`rh_expense_ratio`, `revenue_per_employee`, `gross_margin_pct`, `net_margin_pct`, `payroll_total`, `net_burn_rate`) that `return 0` when the underlying data is missing/zero, instead of `null`/unavailable. This directly violates rule #2 of the Financial & BI Analyst persona above. `src/lib/core/kpiEngine.js` already has the right pattern (`KPI_STATUS.UNAVAILABLE`) — the registry's `calculate()` functions should use it instead of `|| 0` short-circuits.
- **`jsconfig.json` excludes `src/lib`, `src/api`, and never includes any of `base44/`** from `npm run typecheck`. This is why the dangling import above was never caught. Treat `npm run typecheck` as covering only `src/components`, `src/pages`, and `src/Layout.jsx` until this is widened.
- Mojibake (broken text encoding) is present in `base44/shared/{dataProfiler,semanticMatcher,normalizationEngine,grainEngine,observationEngine,quantitativeEngine,qualitativeEngine,externalSignalEngine,contextEngine,decisionEngine,evidenceEngine}.ts`, `base44/shared/importUtils.ts`, and `base44/functions/semanticIngest/entry.ts` — confirmed limited to comments/docstrings on the samples checked, but re-save these files as clean UTF-8 and re-read any French keyword literals near matching logic before trusting them.

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