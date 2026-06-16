# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser app that estimates the monthly carbon footprint of personal AI usage. **The entire calculator lives in `index.html`** — HTML, CSS (one `<style>` block), and vanilla JS (one `<script>` block). No framework, no transpilation for the calculator itself.

There are two deploy targets:
- **GitHub Pages** (public demo): serves `index.html` directly. Survey collection no-ops there (the `/collect` path 404s).
- **TELUS Gizmos** (real home, live at `https://ai-carbon-footprint.telus.gizmos.run`): a thin **plain Workers module** (no imports — see below) serves the same `index.html` *and* exposes a same-origin `POST /collect` that writes survey submissions to the app's own per-app **D1** database, plus `GET /export` (CSV). **Endpoints must not start with `/api/`** — that prefix is reserved by the gizmos platform and app POSTs to it are blocked. Worker logic lives in `scripts/worker.template.ts`; the deployable bundle is the self-contained `gizmos-app/` dir (generated `src/index.ts` + `wrangler.toml`). See `docs/superpowers/specs/` for the collection design.

## Running, verifying, deploying

- **Run locally:** open `index.html` in a browser (`open index.html` on macOS). No server needed for the calculator.
- **No test / lint tooling.** Verification is manual: open the page and walk the flow. Fast JS syntax check:
  ```bash
  awk '/<script>/{f=1;next}/<\/script>/{f=0}f' index.html > /tmp/check.js && node --check /tmp/check.js
  ```
- **GitHub Pages deploy = `git push`.** Pages serves `main` at https://bvillav-a11y.github.io/ai-carbon-calculator/ (~1 min after push).
- **Gizmos deploy:** the worker serves `index.html` from a base64 string inlined into the worker. Two hard-won constraints shape this: (1) the Gizmos loader **does not resolve a bare `hono` import at runtime** (a Hono worker 500s on load) — so the worker is a **plain Workers module, no imports**; (2) it must be **one self-contained file** (the loader also doesn't resolve relative imports between source files); (3) base64 (not a template literal) because `index.html`'s inline `<script>` is full of backticks/`${...}`. Edit worker logic in **`scripts/worker.template.ts`**; `scripts/embed.mjs` compiles that template + `index.html` into the generated, deploy-only **`gizmos-app/src/index.ts`**. **After ANY edit to `index.html` OR the template, regenerate:** `node scripts/embed.mjs`. Then deploy: `gizmos push --dry-run --org telus gizmos-app` then `gizmos push --org telus gizmos-app` (needs `GIZMOS_API_KEY`; multi-org accounts need `--org telus`; first deploy used `--app ai-carbon-footprint` because `ai-carbon-calculator` was taken). D1 is auto-provisioned; the `responses` table is created lazily (`CREATE TABLE IF NOT EXISTS`). `gizmos logs <app> --org telus` works with the push key; `gizmos db` does **not** (DB reads need an OIDC/browser session — verify data via the worker's own `/export`).
  - **Gizmos D1 gotcha:** the loader wraps D1 in a `D1Proxy`. Use `db.run(sql, ...params)` / `db.first(sql, ...params)` / `db.exec(sql)`, or the standard `db.prepare(sql).bind(...).run()/all()`. Both work.

## Architecture — the screen pipeline

The app is a linear flow of screens toggled via `style.display` (one visible at a time):

1. **`#intro`** — landing page; "Start quiz" calls `startQuiz()`; "See average results" calls `runDefaults()`. Also hosts the theme toggle and the collection-consent checkbox.
2. **`#wizard`** — survey driven by the `STEPS` array. `renderStep()` builds each step's HTML by `type` (`likert` / `choice` / `multichoice` / `tokens`); answers accumulate in the `answers` object keyed by step `id`.
3. **`#calcScreen`** — the calculator; `recalc()` reads the DOM inputs and renders every result. The survey goes **straight here** (the old `#inferScreen` was removed); `buildInference()`'s `reasons.*` strings are surfaced as ℹ️ tooltips on the matching calc controls via `setTip()`.

Conceptual data flow: **survey answers → inferred parameters (tooltips) → carbon math → tangible equivalents.**
- The `infer*()` helpers map likert/choice indices to physical parameters + a `reasons.*` string. Model tier is driven by task complexity alone — interactivity feeds `inferUtil`, not the tier.
- `wizNext()` (last step) and `runDefaults()` both land on `#calcScreen`; `showCalc()` pushes inferred values into the form controls, sets tooltips, then `recalc()`.
- `recalc()` is the render hub: `computeCarbon()` → result cells, ledger trace (`#eqbox`), scenario comparison (neutral magnitude bars, Haiku/Sonnet/Opus), confidence bars, assumptions table.
- **Collection:** `collectBaseline()` snapshots the frozen baseline at first results render and fires a same-origin `POST` to `COLLECT_URL` (`/collect`); `markExplored()` updates it (debounced) on later tweaks. Consent-gated (`hasConsent()`), upsert-by-`sessionId`. The worker (`gizmos-app/src/index.ts`) persists it to D1.

## The core calculation

`computeCarbon(p, modelId, tokenCount)` is the single source of truth for the math. The chain (mirrored on screen in the ledger trace):

```
raw energy = inTok·input_kWh/kTok + outTok·output_kWh/kTok
           ÷ utilisation  → × PUE  → × grid g/kWh  = operational kg CO₂
           + embodied (GPU manufacture CO₂ amortised over lifetime tokens)
           = total kg CO₂
```

It is a pure function of its arguments — reuse it for any "what-if" (the scenario comparison just calls it with different `modelId`s and the same `p`).

## Where the assumptions live (keep these in sync)

The app's credibility rests on a few hard-coded constant tables **and** the UI narratives that describe them. The narratives are maintained by hand — they do not read the constants programmatically — so if you change a number, update its description too:
- `MODEL_SPECS` — per-model input/output kWh-per-kTok (sourced in README "Energy per token").
- `GPU_SPECS` — TDP / throughput / embodied CO₂ per GPU.
- `GRID_MAP` and the `#locTbl` region rows — grid carbon intensities.
- The `factors` array in `recalc()` (confidence bars) and the `rows` array (assumptions table) describe the constants above. Edits to numbers must be reflected in these by hand.

## Conventions that matter

- **Accessibility is a maintained requirement (WCAG 2.1 AA).** Survey controls use ARIA radio-group patterns with arrow-key navigation (`choiceKey`), `aria-live` regions announce progress/results, and every interactive control has a visible focus ring. Preserve these when editing markup.
- **Escape all survey-derived text** through `escapeHtml()` before `innerHTML` insertion — keep doing this for any `STEPS` content.
- **Shareable links:** `serializeState()` / `applyHashState()` round-trip calculator state through a base64url-encoded URL hash (`#s=...`) using the compact `SHARE_KEYS` map. If you add a calculator input that should be shareable, add it to `SHARE_KEYS`.
- **CSS theming** uses custom properties in `:root` (several colours were lifted specifically for AA contrast — see the inline comments). Reuse the tokens rather than hard-coding colours.
