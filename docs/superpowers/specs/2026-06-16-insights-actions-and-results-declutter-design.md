# Design: Insights & actions + results-screen declutter

**Date:** 2026-06-16
**App:** AI Carbon Calculator (`index.html`)

## Overview

Three related changes to the results screen (`#calcScreen`), for the person who wants to *act* on their footprint:

- **A. New "Insights & actions" card** — a hybrid of personalized insights (lead) + a short static checklist. The lead insight right-sizes the model to the user's real need; a second personalizes the electricity grid.
- **B. Declutter via progressive disclosure** — reorder to outcome-first and hide detail behind expanders: the editable parameter cards collapse into one "⚙ Adjust parameters" section (collapsed by default), and the "Calculation trace" collapses too.
- **C. Engagement telemetry** — extend the collection record with results-page dwell time and booleans for which menus were expanded + whether Share / Retake were used.

Both stay inside `index.html` (calculator source of truth) and flow through `recalc()` so they update live. No new constant tables.

---

## Part A — "Insights & actions" card

### Placement & render
A new `card` placed **after the Results headline, before "Adjust parameters"** (per approved layout A: Results → **Insights** → Adjust params → Scenario → trace → confidence → assumptions). Filled by a new `renderInsights(p, r)` called at the end of `recalc()` so it tracks live edits. Content is app-generated; still pass any interpolated label through `escapeHtml()` for consistency.

### Block 1 — 🎯 Right-size your model *(prominent lead)*
Operationalizes "select the model according to the real need."

- **Tier order:** `['haiku','sonnet','opus']`. The recommended tier comes from the survey task-complexity answer via the existing `inferModel(answers.task_type)`.
- **Survey path (b)** — only when on a Claude tier (`p.modelId ∈ {haiku,sonnet,opus}`) **and** `answers.task_type !== undefined`:
  - **Over-provisioned** (selected index > recommended index): *"Your tasks look mostly {complexity} — {selected} is heavier than you need. {recommended} would likely handle them and cut ~{Δkg} kg/mo (−{Δ%})."* Δ from `computeCarbon(p, recommendedId, p.tokens)` vs `r.totalKg`.
  - **Well-matched** (equal): *"{selected} fits your {complexity} workload — good match. Drop to Haiku for quick lookups."*
  - **Under-provisioned** (selected index < recommended): *"Your tasks look {complexity}; {selected} may underperform — size up only if quality suffers."* (No carbon nudge; honesty over savings.)
- **Fallback (c)** — quick-run (no `answers.task_type`) or non-Claude tool: always-present principle line: **Haiku** → quick lookups · **Sonnet** → balanced · **Opus** → hard reasoning. *"Pick the smallest model that meets the need — over-provisioning burns carbon for no quality gain."*
- The (c) principle line renders in **all** cases (under the personalized line) so the right-size message is always present.

### Block 2 — 🌱 Cleaner electricity *(personalized)*
- Constants: `GRID_HIGH = 150`, `GRID_CLEAN_REF = 50` (g CO₂/kWh — a hydro/nuclear-class grid).
- If `p.grid > GRID_HIGH`: compute a clean-grid scenario by cloning `p` with `grid = GRID_CLEAN_REF` and calling `computeCarbon`. *"Your grid is ~{p.grid} g CO₂/kWh. Running where the grid is cleaner (hydro/nuclear ~{GRID_CLEAN_REF} g) would cut ~{Δ%}."*
- If `p.grid ≤ GRID_HIGH`: affirm — *"You're already on a relatively clean grid (~{p.grid} g) — nice."*

### Block 3 — ✅ Other ways to cut it *(static, 3 items)*
Muted checklist, same for everyone:
- **Trim output length** — output tokens cost ~5× input; ask for concise answers.
- **Use it deliberately** — every token scales linearly; reuse/save good outputs instead of regenerating.
- **Prefer greener providers/regions** when you can choose.

### Styling
Reuse `card`/`clabel`/`hint` and the semantic tokens: **green** marks the lighter/cleaner option in each insight; the static checklist is muted. The card has a left-accent on each personalized insight line. The `🎯` block is visually the lead.

---

## Part B — Results-screen declutter (outcome-first + collapse)

### New card order in `#calcScreen`
1. **Results — this month** (the 4 result cells + per-token + the "underestimate" disclosure + Share button). Moves to the top.
2. **🎯 Insights & actions** (Part A).
3. **⚙ Adjust parameters** — collapsible (collapsed by default) wrapping the three input cards: **Model & usage**, **Hardware**, **Electricity grid**. The existing embodied-carbon `advSec` sub-collapse stays nested within Hardware.
4. **Scenario comparison**.
5. **▾ Calculation trace** — collapsible (collapsed by default), holding `#eqbox`.
6. **Estimate confidence**.
7. **Assumptions & sources**.

### Collapse mechanism
Generalize the existing `toggleAdv()`/`#advSec` pattern into two new toggles, reusing its CSS approach (`.open` class toggling `display`/max-height):
- `toggleParams()` → button "⚙ Adjust parameters", controls `#paramsSec` (wraps the 3 input cards). Collapsed by default.
- `toggleTrace()` → button "Calculation trace", controls `#traceSec` (wraps `#eqbox`). Collapsed by default.
- Each toggle button: `aria-expanded` (false initially), `aria-controls` the section id, visible focus ring, chevron indicator (▸ collapsed / ▾ open). Keyboard-operable (it's a `<button>`).

### Interaction with existing flow
- `showCalc()` (survey) and `runDefaults()` (quick-run) already populate the controls and call `recalc()`. They render with **parameters collapsed** by default — the user lands on Results + Insights. No change needed to those functions beyond ensuring the collapsibles start collapsed (markup default).
- Editing a parameter (after expanding) still triggers `recalc()` (and `markExplored()` for collection) exactly as today — the controls are unchanged, only their container is collapsed.
- **Retake survey** / **average-user** badges live inside the parameter cards; they remain reachable once expanded. The "Retake survey" control stays in the header (unchanged).
- Shareable-link recipients (`applyHashState`) land on the same restructured screen; collapsed by default is fine.

---

## Part C — engagement telemetry

Extends the existing collection record (consent-gated, upsert-by-`sessionId`, `pagehide`-finalised) with six engagement fields — no new infrastructure.

### New fields (same `responses` row)
| Column (D1) | Client key | Type | Meaning |
|---|---|---|---|
| `dwell_ms` | `dwellMs` | int | Results-page time: first results render (`collectBaseline`) → tab leave/hide |
| `opened_params` | `openedParams` | bool→int | Ever expanded "⚙ Adjust parameters" |
| `opened_trace` | `openedTrace` | bool→int | Ever expanded "Calculation trace" |
| `opened_advanced` | `openedAdvanced` | bool→int | Ever expanded "embodied carbon settings" |
| `clicked_share` | `clickedShare` | bool→int | Clicked "🔗 Share results" |
| `retook_survey` | `retookSurvey` | bool→int | Clicked "Retake survey" |

### Client (`index.html`)
- `_collect.startTs = Date.now()` stamped when the baseline is set; new flags initialised on the payload (`false`/`0`).
- A small `markEngagement(key)` helper sets `_collect.payload[key] = true` and schedules the existing debounced send (reuse the `markExplored` debounce timer). Wire it into the **expand branch** of `toggleParams`/`toggleTrace`/`toggleAdv` (only when opening, not collapsing) and into `shareResults()` and `retakeSurvey()`.
- **`pagehide` finaliser now always fires** (today it only sends if `explored`): set `_collect.payload.dwellMs = Date.now() - _collect.startTs` and send — so dwell + flags land even for a read-only visitor. Guard with `_collect.sent && hasConsent()`.

### Worker (`gizmos-app/src/index.ts` via `worker.template.ts`)
- Add the six columns to `COLS`, to the `CREATE TABLE`, and to the insert params (booleans coerced to `1`/`0`, `dwellMs` as integer).
- **Schema migration:** the prod `responses` table already exists, so `CREATE TABLE IF NOT EXISTS` won't add columns. `ensureTable` runs a **one-time-per-instance, best-effort `ALTER TABLE responses ADD COLUMN …`** for each new field (wrapped in try/catch — SQLite errors on an existing column, which is ignored). New tables get the columns from `CREATE`; the existing table gets them from `ALTER`. Gate with a module-level `let _schemaReady = false` so the ALTERs run at most once per worker instance.

### Privacy
Anonymous engagement signals only (booleans + a duration) — no identity, no free text. Same consent gate as the rest of collection.

### One-row-per-visit note
`retookSurvey` marks that the visitor retook the survey; the post-retake run does **not** create a second row (baseline stays frozen at first results render — consistent with the existing design).

## Cross-cutting constraints
- **Accessibility:** collapsible buttons use `aria-expanded`/`aria-controls`; the Insights card sits in/near an `aria-live="polite"` context so updates are announced; preserve focus rings. Maintain WCAG AA contrast (semantic tokens already AA in both themes).
- **Escaping:** `renderInsights` interpolates model labels/numbers (app-generated) — route any label text through `escapeHtml()` to stay consistent with the codebase rule.
- **Live updates:** `renderInsights` runs inside `recalc()`; collapsing/expanding does not recompute.
- **Themes:** works in light and dark (token-based).
- **No new shareable inputs** → `SHARE_KEYS` unchanged. Collapse state is UI-only (not persisted/shared).

## Data sources (all existing)
- Model savings: `computeCarbon(p, recommendedId, p.tokens)` vs `r.totalKg`.
- Recommended tier: `inferModel(answers.task_type)`.
- Grid savings: `computeCarbon({...p, grid: GRID_CLEAN_REF}, p.modelId, p.tokens)` vs `r.totalKg`.
- Complexity wording: reuse the task-complexity label array already in `buildInference`.

## Out of scope
- No per-action savings for the static checklist (general tips only).
- No new survey questions; no changes to `computeCarbon`.
- Collapse state not persisted across reloads (always starts collapsed).

## Verification plan
Manual (no test tooling): `node --check` on the extracted script; then walk the flow:
- Survey path with simple-task answer + Opus selected → over-provisioned insight with a real Δ; matched case affirms; quick-run shows the (c) fallback.
- High grid (US 400) shows grid-cut insight; low grid (BC 15) affirms.
- Results/Insights show at top; Adjust parameters + Calculation trace start collapsed and expand/collapse via keyboard + click with correct `aria-expanded`; editing an expanded control still updates results live.
- Both themes; light + dark.
