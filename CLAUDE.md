# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, dependency-free browser app that estimates the monthly carbon footprint of personal AI usage. **Everything lives in `index.html`** — HTML, CSS (one `<style>` block), and vanilla JS (one `<script>` block). No build step, no framework, no backend, no npm, no transpilation. `README.md` documents the methodology and data sources; there is no other source code.

## Running, verifying, deploying

- **Run locally:** open `index.html` in a browser (`open index.html` on macOS). No server needed.
- **No test / lint / build tooling exists.** Verification is manual: open the page and walk the flow. For a fast JS syntax check without a browser, extract the script block and check it:
  ```bash
  awk '/<script>/{f=1;next}/<\/script>/{f=0}f' index.html > /tmp/check.js && node --check /tmp/check.js
  ```
- **Deploy = `git push`.** GitHub Pages serves the `main` branch root (`/`) at https://bvillav-a11y.github.io/ai-carbon-calculator/. Committing to `main` and pushing redeploys automatically (~1 min). There is no separate deploy step — the live site *is* whatever is on `main`.

## Architecture — the three-screen pipeline

The app is a linear flow of screens toggled via `style.display` (one visible at a time):

1. **`#intro`** — landing page; the "Start quiz" button calls `startQuiz()`.
2. **`#wizard`** — 8-question survey driven by the `STEPS` array. `renderStep()` builds each step's HTML by `type` (`likert` / `choice` / `tokens`); answers accumulate in the `answers` object keyed by step `id`.
3. **`#inferScreen`** — `buildInference()` derives technical parameters from `answers`; the user can override any value via sliders.
4. **`#calcScreen`** — the calculator; `recalc()` reads the DOM inputs and renders every result.

Conceptual data flow: **survey answers → inferred parameters → carbon math → tangible equivalents.**
- The `infer*()` helpers (`inferModel`, `inferGPU`, `inferPUE`, `inferUtil`, `inferGrid`) map likert/choice indices to physical parameters. Each also produces a human-readable `reasons.*` string shown on the inference screen. Note: model tier is driven by task complexity alone — interactivity feeds `inferUtil`, not the tier.
- `showCalc()` pushes inferred values into the calculator's form controls, then calls `recalc()`.
- `recalc()` is the render hub: it calls `computeCarbon()` and writes the result cells, the ledger calculation trace (`#eqbox`), the scenario comparison (always Claude Haiku/Sonnet/Opus), the confidence bars, and the assumptions table.

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
