# Design: AI Carbon Calculator — technical talk deck

**Date:** 2026-06-16
**Artifact:** A reveal.js slide deck explaining the calculator's design logic, modelling bases, and deployment process.

## Overview

A ~20-minute presentation for **technical peers** (data scientists / engineers) that explains the AI Carbon Calculator across three pillars: **the logic of the choices**, **the bases** (the math + the data behind it), and **the process of deployment** (gizmos). The deck is a visual sibling of the app — it reuses the app's exact dark-mode design tokens, fonts, and motifs — and ships with **presenter notes** so the talk can be rehearsed and delivered to time.

It lives as a static file in the repo at `presentation/index.html`. It is **not** wired into the gizmos worker or GitHub Pages deploy in this project (it's a self-contained static artifact, trivially Pages-publishable later if wanted).

## Decisions (locked during brainstorming)

- **Audience:** technical peers → keep real code, equations, constant tables with sources, and deployment gotchas front-and-centre.
- **Scope:** slides **+ presenter notes** (talk-track in `<aside class="notes">`; depth/war-stories live in notes, slides stay uncluttered).
- **Tooling:** **reveal.js**, chosen for its speaker view (notes + timer + next-slide preview) and PDF export. **Vendored locally** (not CDN) so the deck works fully offline. Fonts vendored too.
- **Look:** custom reveal theme that pulls the app's `:root` tokens verbatim.
- **Location:** `presentation/index.html` in the repo; local-only (no deploy step).

## Look & feel — design fidelity

Reuse the app's design tokens exactly (from `index.html` `:root`, dark theme):

| Token | Value | Use in deck |
|---|---|---|
| `--bg` | `#0d1117` | slide background |
| `--surface` | `#161b22` | card backgrounds |
| `--surface2` | `#1c2330` | nested/inputs, code blocks |
| `--border` | `#444c56` | card borders, dividers |
| `--green` | `#3fb950` | section labels, headline/impact numbers, progress bar |
| `--green-dim` | `#122d1a` | label/badge backgrounds |
| `--text` | `#e6edf3` | body text |
| `--muted` | `#b1bac4` | secondary text, captions |
| `--blue` `--purple` | `#79b8ff` `#bc8cff` | input/output token split (energy-per-token slide) |
| `--teal` `--orange` `--pink` | `#2fd4c6` `#ff9d3c` `#ff8ad4` | equivalents accents (trees / km / USD) on the "kg → meaning" slide |
| `--amber` | `#e3b341` | uncertainty / caveat callouts |
| `--mono` | `Space Mono` | code, figures, the mono-uppercase labels |
| `--sans` | `Space Grotesk` | headings + prose |

**Motifs carried over from the app:**
- Section labels in **mono, uppercase, letter-spaced** green (the app's `.clabel` / `.sec-label` style).
- Key content grouped in the app's **rounded bordered cards** (`--surface`, `1px solid --border`, `border-radius:8–10px`).
- A thin **green progress bar** along the bottom of slides (mirrors the wizard progress bar).
- The calculation chain rendered like the app's **ledger trace** (`#eqbox`): right-aligned running values in mono.
- **Confidence bars** styled as in the app for the uncertainty slide.

**Content integrity:** all code snippets are lifted verbatim from the repo (`computeCarbon`, a worker route handler, the `embed.mjs` pipeline). All figures trace to `MODEL_SPECS` / `GPU_SPECS` / `GRID_MAP` and the README's cited sources — no invented numbers.

## File structure

```
presentation/
  index.html          # the deck: reveal markup + inline custom theme <style> + <aside class="notes">
  reveal/             # vendored reveal.js (dist/ + plugin/notes/ + plugin/highlight/)
  fonts/              # vendored Space Grotesk + Space Mono (woff2) + @font-face CSS
  README.md           # how to present (open file, press S for speaker view) + how to export PDF (?print-pdf)
```

- The deck is a single authored HTML file; theme CSS is an inline `<style>` block (matches the app's single-file ethos). reveal core + plugins + fonts are vendored static assets.
- Plugins: `RevealNotes` (speaker view), `RevealHighlight` (code syntax). Keep config minimal; subtle slide transition.

## Mechanics

- **Speaker view:** `<aside class="notes">` per slide; press `S` to open the speaker window (notes + timer + next preview). This is where talk-track, timing cues, and deployment war-story detail live.
- **PDF export:** open with `?print-pdf` and print to PDF (documented in `presentation/README.md`).
- **Offline:** reveal + fonts vendored; no network needed at talk time.
- **Navigation:** arrow keys / space; `ESC` slide overview; `S` speaker view.

## Slide outline (~20 min, ≈1 min/slide)

**Open (~2 min)**
1. **Title** — app wordmark on the dark skin; subtitle, presenter name, date.
2. **The question** — "what does my AI use actually cost the planet?" Providers don't disclose; nobody really knows. Thesis + link to the live app.

**Pillar I — The logic of the choices (~6 min)**
3. **Mental model** — data-flow diagram: *survey answers → inferred parameters → carbon math → tangible equivalents.*
4. **Why a survey, not raw inputs** — meet users where they are; map plain-language answers to physical params (task complexity → model tier; hardware type → PUE; interactivity+frequency → utilisation).
5. **Outcome-first UX** — Results → Insights & actions → progressive disclosure ("More information" row of collapsibles). Give the number + the action; hide the knobs.
6. **Credibility by design** — every assumption editable *and* sourced; confidence bars; the "probably an underestimate" disclosure; reserved impact-colour (neutral scenario tiers); WCAG 2.1 AA / ARIA.

**Pillar II — The bases: the math & the data (~7 min)**
7. **The calculation chain** — the equation as a ledger: `raw energy = inTok·in_kWh/kTok + outTok·out_kWh/kTok → ÷ utilisation → × PUE → × grid g/kWh = operational → + embodied = total kg CO₂`. (Meaty slide; notes walk each step.)
8. **Energy per token** (`MODEL_SPECS`) — Haiku/Sonnet/Opus input vs output kWh-per-kTok; output ~5× input; why per-token; source (Epoch AI).
9. **Hardware & overhead** (`GPU_SPECS`, PUE, utilisation) — TDP / throughput / embodied per GPU; PUE = data-centre overhead (1.2 hyperscaler → 2.0 on-prem); energy/useful-token scales as 1 ÷ utilisation.
10. **The grid** — gCO₂/kWh by region (BC 15 → Poland 700); why grid choice often dominates the result; the clean-grid insight (`GRID_HIGH = 150`, `GRID_CLEAN_REF = 50`).
11. **Embodied carbon** — GPU manufacture CO₂ amortised over lifetime tokens (`gpuCo2 / (gpuTok·life·12) · tokens`); small contribution but included for honesty.
12. **kg → meaning** — equivalents: `KM_PER_KG = 6.0`, `TREE_KG_YR = 22`, `CARB_PRICE = 50`; teal/orange/pink accents; why tangibles beat abstract kg.
13. **Honesty about uncertainty** — confidence bars per factor; what's excluded (training, networking, cooling water, non-GPU embodied); `computeCarbon` is one **pure function** reused for every what-if (scenario tiers call it with different `modelId`).

**Pillar III — The process of deployment (~5 min)**
14. **Two homes** — GitHub Pages (public demo; `/collect` no-ops) vs TELUS gizmos (real home; same-origin collection).
15. **gizmos architecture** — one **plain Workers module** (no imports) serving base64-embedded `index.html` + `POST /collect` → per-app **D1** + `GET /export` (CSV).
16. **The war-stories** *(the fun slide)* — three platform lessons, each a distinct failure mode: (1) a bare `hono` import → 500 on module load → rewrite as a plain Workers module; (2) `/api/*` is reserved by the platform → app POSTs silently blocked → move endpoints to `/collect` & `/export`; (3) Apps-Script cross-origin requests dropped the auth cookie (third-party-cookie stripping) → pivot to same-origin collection — which motivates the slide 14–15 architecture. *(Deliberately cut to keep the slide focused: the base64 embed, the `D1Proxy` API quirk, and the `ALTER`-migration lesson — the last reappears on the Takeaways slide.)*
17. **The embed pipeline** — `index.html` (source of truth) + `worker.template.ts` → `embed.mjs` → generated `gizmos-app/src/index.ts` → `gizmos push --org telus`; **regenerate after every edit**.
18. **Collection & telemetry** — consent-gated; upsert-by-`sessionId`; baseline frozen at first results render; engagement signals (`dwell_ms`, opened-menu booleans, share, retake).

**Close (~1 min)**
19. **Takeaways** — platform constraints shape architecture; ship the schema *and* its migration together; transparency is a feature, not overhead; right-size your model (the app's own lesson, applied to how we build).
20. **End** — live app link + repo link; "questions?".

## Out of scope

- No deploy step for the deck (local file only; Pages-publishable later if wanted).
- No live/embedded version of the calculator inside the deck (static screenshots/recreations of motifs only — avoids embedding the full app and its collection logic in the talk).
- No animations beyond reveal's default subtle transition + reveal fragments where a build helps (e.g. the calculation chain revealed step-by-step).
- No content beyond the 20 slides above; no second deck variant for a different audience.

## Verification plan

Manual (no test tooling for a static deck):
- Open `presentation/index.html` in a browser; arrow through all 20 slides — every slide renders on the dark skin with correct fonts (fonts load from vendored files, not network).
- Press `S` → speaker view opens with notes + timer + next-slide preview; notes present on every slide.
- Disconnect network, reload — deck still renders fully (offline check: confirms reveal + fonts are vendored, no CDN).
- `?print-pdf` + print preview produces clean one-slide-per-page PDF.
- Spot-check figures on slides 8/10/12 against `MODEL_SPECS` / `GRID_MAP` / equivalents constants in `index.html` — no drift.
- Code snippets on slides 7/16/17 match the repo verbatim.
- Timing: a read-through of the notes lands within ~18–22 minutes.
