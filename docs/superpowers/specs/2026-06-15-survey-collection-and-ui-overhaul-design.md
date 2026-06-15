# Design: Survey data collection + UI overhaul

**Date:** 2026-06-15
**App:** AI Carbon Calculator (`index.html`, single-file, dependency-free, GitHub Pages)

## Overview

Two bundles of work, shipped together:

1. **Feature — survey data collection.** Phone each completed run home to a Google Sheet (via a Google Apps Script Web App) so the owner can analyse what people answer.
2. **UI overhaul — six tweaks.** Light/dark theme, a consistent semantic colour system, softer (less "griddy") tables, a re-ordered token question, a model-selection note, and removal of the inference/preview screen.

All work stays inside `index.html` (plus `README.md` docs and the externally-hosted Apps Script). No build step, no framework, no npm.

---

## Part 1 — Survey data collection

### 1.1 Architecture

```
index.html (browser)  ──POST JSON (fire-and-forget)──▶  Apps Script Web App  ──upsert row──▶  Google Sheet
```

- The Apps Script is the owner's code but lives at Google, not in the repo. The repo learns only its public deployment URL, stored in one constant `COLLECT_URL` in `index.html`.
- All client collection logic is a small self-contained module (a constant + ~4 functions), kept out of `recalc()` so the render hub stays render-only.
- Sends are **fire-and-forget** (`fetch(url, {method:'POST', mode:'no-cors', body})` and `navigator.sendBeacon` on page-hide). The browser cannot read the response; none is needed.
- If `COLLECT_URL` is empty/placeholder, collection is a silent no-op (safe default until the owner deploys the script).

### 1.2 Payload schema

One submission is a flat JSON object:

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string (UUID) | `crypto.randomUUID()`; per-visit dedup key only, not identity |
| `quickRun` | bool | `true` if the user clicked "See average results" (skipped the survey); `false` for a real survey run |
| `ai_tool` | int[] \| null | survey answer (multi-select indices); `null` when `quickRun` |
| `hardware` | int \| null | survey answer index |
| `output_ratio` | int \| null | survey answer index |
| `task_type` | int \| null | survey answer index |
| `interactive` | int \| null | survey answer index |
| `frequency` | int \| null | survey answer index |
| `tokens` | int | token count (DEFAULT_PROFILE value when `quickRun`) |
| `model` | string | inferred/baseline model id |
| `gpu` | string | baseline GPU id |
| `util` | int | baseline utilisation % |
| `pue` | number | baseline PUE |
| `grid` | int | baseline grid intensity g/kWh |
| `carbonKg` | number | resulting total kg CO₂ at baseline |
| `explored` | bool | set `true` once the user changes any calc control after the baseline |
| `editCount` | int | number of meaningful post-baseline changes |
| `clientTime` | string (ISO) | browser timestamp; the sheet also stamps server time |

**Baseline freeze:** all parameter/result fields are snapshotted at the moment the calculator (`#calcScreen`) first renders — the honest "usage" record. Post-results slider tweaks are treated as *exploration*: they only flip `explored`/bump `editCount`, never overwrite the baseline values.

### 1.3 Triggers & upsert

- **Survey path:** baseline send fires at the end of `showCalc()` (first results render).
- **Quick-run path:** baseline send fires at the end of `runDefaults()`, with `quickRun:true` and survey fields `null`.
- **Exploration update:** when the user changes a calc control after baseline, mark `explored=true`, bump `editCount`, and send an update — debounced ~2 s after changes settle, plus a `navigator.sendBeacon` on `pagehide`/`visibilitychange:hidden` as a safety net.
- The Apps Script **upserts by `sessionId`**: find the existing row → overwrite it, else append. Result: exactly one always-current row per visitor. Because the baseline fields in the payload never change after the freeze, only `explored`/`editCount` differ between sends.

### 1.4 Consent (notice + opt-out, on the intro screen)

- A short, visible notice + opt-out toggle on `#intro` — both "Start quiz" and "See average results" live there, so it is guaranteed to be seen before any send, in either path. Example copy: *"📊 Anonymous responses help improve this tool. [✓ Share mine]"*, defaulting to share (opt-out model).
- The choice is remembered in `localStorage` (`collectConsent`). Unticking it before proceeding means nothing is ever sent (and suppresses the exploration update too).
- `README.md` gains a short "Data collection" section documenting exactly what is gathered (transparency is standard practice for anything phoning home).

### 1.5 Apps Script + setup (owner one-time steps)

Documented in README. Steps:

1. Create a Google Sheet; note its tab name.
2. Extensions → Apps Script; paste a `doPost(e)` that parses `JSON.parse(e.postData.contents)`, locates the row whose first column matches `sessionId`, updates it or appends a new row with a fixed column order + a server `Date()` stamp.
3. Deploy → New deployment → Web app → "Execute as me", "Who has access: Anyone".
4. Copy the deployment URL into `COLLECT_URL` in `index.html`.

The script (~25 lines) ships in the spec/README. Free-tier; quota-limited (not billed). The endpoint is public — the script does light validation/shared-secret check to deter junk POSTs.

### 1.6 Error handling

Collection is best-effort and invisible. All sends are wrapped so any network/script failure is swallowed; the calculator behaves identically whether or not a send succeeds.

---

## Part 2 — UI overhaul

### 2.1 Light/dark theme

- Theme driven by a `data-theme` attribute; `:root` holds the dark tokens (default), `[data-theme="light"]` overrides them. Reuse existing CSS custom properties — no hard-coded colours.
- Toggle (☀️/🌙) sits **top-right on the intro screen**; applies globally. Choice persisted in `localStorage` (`theme`); initial value = stored preference, else `matchMedia('(prefers-color-scheme: light)')` (OS default).
- **Proposed light palette** (AA-tuned, GitHub-light-derived):

  | Token | Light value | Token | Light value |
  |---|---|---|---|
  | `--bg` | `#ffffff` | `--text` | `#1f2328` |
  | `--surface` | `#f6f8fa` | `--muted` | `#59636e` |
  | `--surface2` | `#eef1f5` | `--dim` | `#6e7781` |
  | `--border` | `#d0d7de` | `--green` | `#1a7f37` |
  | (divider) | `#eaecef` | `--amber` | `#9a6700` |
  | `--focus` | `#0969da` | `--red` | `#cf222e` |
  | `--blue` | `#0969da` | `--purple` | `#8250df` |

  All accent values verified ≥ 4.5:1 on `--bg` during implementation.

### 2.2 Semantic colour system — "one colour = one meaning"

| Role / information | Colour | Applies to |
|---|---|---|
| Low impact / good / confirmed / high confidence | green | low-carbon headline, high confidence bars, confirmed/"surveyed" values |
| Medium impact / caution / medium confidence | amber | medium-carbon headline, mid confidence bars |
| High impact / warning / low confidence | red | high-carbon headline, low confidence bars |
| Interactive | blue | links, retake, share, **editable values & slider labels** (moved off amber) |
| Input-token category | blue | split bar input half (localised widget with its own inline legend) |
| Output-token category | purple | split bar output half |
| Comparison magnitude | neutral grey (`#5a6b8c` dark / `#8c9bb0` light) | scenario bars — **length alone conveys impact** |

- **Model tiers are neutral** (decision B): Haiku/Sonnet/Opus names render in plain text; comparison bars are one neutral grey; *length* shows impact. The user's own model row gets a subtle highlight + a blue "you" tag — no colour-coding of models.
- **Editable values move from amber → blue**, freeing amber to mean "medium impact" consistently.
- **Headline impact tier** uses green/amber/red via thresholds. Initial constant `IMPACT_THRESHOLDS = { low: 2, high: 10 }` kg CO₂/month (< 2 green, 2–10 amber, > 10 red). Explicitly tunable; calibrate against typical results during implementation.

### 2.3 Less "griddy" tables (decision A — row dividers only)

- Drop vertical/cell borders in the data tables (model grid, location table `#locTbl`/`.loc-tbl`, assumptions table `.atbl`).
- Replace with a single low-contrast horizontal divider per row (`#21262d` dark / `#eaecef` light), a touch stronger under the header (`#30363d` dark / `#d0d7de` light); no divider on the last row.
- **Interactive controls keep their AA borders / selected / focus states** — this change only touches decorative data tables, preserving WCAG 2.1 AA non-text contrast for components.

### 2.4 Token question layout

Re-order the `tokens` step in `renderStep()`:

1. **"Quick estimate"** as a real uppercase subtitle (green accent), replacing the inline label.
2. The 7 presets as a **4-column grid** below it, kept in ascending order (500K, 5M, 10M, 50M, 100M, 500M, 1B), selected one highlighted.
3. An **"or enter your own"** divider, then the **custom number input bar at the bottom** (buttons are expected to be used more often).

Preserve ARIA: presets stay an `aria-pressed` button group; the input keeps its label + `aria-describedby`.

### 2.5 Model-selection note

Add a short helper note by the calculator's model selector: *"Pick the model you use most — we'll base the estimate on that one."* Plain text, muted styling, no behaviour change.

### 2.6 Remove the inference/preview screen

- Survey flow becomes `#wizard → #calcScreen` directly (skip `#inferScreen`). `buildInference()` still runs to compute baseline parameters and `reasons.*`; `showCalc()` pushes parameters into the calculator controls as before.
- The override role of `#inferScreen` is redundant — everything is editable on the results page.
- The `reasons.*` explanations become **ℹ️ tooltips** (hover/focus, with accessible `aria-describedby`/title) attached to the corresponding calculator controls. No separate section.
- Remove the `#inferScreen` markup and its now-unused render/navigation code; rewire the last survey step's "next" to `showCalc()`. Consent already lives on intro, so it does not depend on this screen.

---

## Cross-cutting constraints (must preserve)

- **Accessibility (WCAG 2.1 AA):** ARIA radio/checkbox patterns, arrow-key nav (`choiceKey`), `aria-live` regions, visible focus rings, tooltip accessibility. Verify contrast in both themes.
- **Escaping:** all survey-derived text through `escapeHtml()` before `innerHTML`.
- **Shareable links:** if any new calculator input becomes shareable, add it to `SHARE_KEYS`. (Theme choice and consent are local prefs, not shared state — keep them out of the hash.)
- **Keep-in-sync narratives:** colour/label changes must stay consistent with the `factors`/`rows` arrays and `#locTbl` rows that describe the constants.
- **CSS theming:** reuse `:root` custom-property tokens; no hard-coded colours.

## Updated data flow

`survey answers → inferred parameters (tooltips on calc controls) → carbon math → tangible equivalents`, with a parallel `→ baseline snapshot → fire-and-forget POST → Google Sheet (upsert by sessionId)` branch gated by intro-screen consent.

## Setup / dependencies (flagged)

- **Owner must deploy the Apps Script and paste `COLLECT_URL`** before any data is collected. Until then: silent no-op.
- Google account only (free tier; quota-limited, not billed).
- No new client dependencies; `crypto.randomUUID()` and `navigator.sendBeacon` are standard in current browsers.

## Out of scope / non-goals

- No aggregation dashboard (analyse in Sheets directly).
- No storing of exploratory tweak *values* (only the `explored`/`editCount` flags).
- No backend of the owner's own; no auth; no per-user identity.
- No change to the core `computeCarbon()` math.

## Verification plan

Manual (no test tooling exists):
- `awk` script-extract + `node --check` for JS syntax.
- Walk both flows (survey + quick-run) in browser; confirm one POST at baseline, `explored` update on tweak (inspect Network tab / Sheet).
- Toggle theme; confirm persistence + OS default + AA contrast both modes.
- Confirm tables render with row dividers only; token question re-ordered; model note present; inference screen gone with reasons as tooltips.
- Confirm opt-out suppresses all sends.
