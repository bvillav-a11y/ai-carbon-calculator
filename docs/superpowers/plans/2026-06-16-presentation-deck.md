# Presentation Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `presentation/index.html` — a ~20-minute, app-themed reveal.js talk for technical peers explaining the AI Carbon Calculator's design logic, modelling bases, and gizmos deployment, with presenter notes.

**Architecture:** A single authored HTML file using a vendored (offline) reveal.js + the Notes plugin. The visual theme is an inline `<style>` block that pulls the app's `:root` design tokens verbatim. Fonts (Space Grotesk, Space Mono) are vendored as woff2. Each slide carries an `<aside class="notes">` talk-track. No build step; no deploy.

**Tech Stack:** reveal.js 5.x (vendored UMD build + notes plugin), `@fontsource` woff2 files, vanilla HTML/CSS. Node/npm used **once** to fetch vendor assets (network required for that step only).

**Source of truth for content:** `docs/superpowers/specs/2026-06-16-deck-design.md` and the live `index.html` constants (`MODEL_SPECS`, `GPU_SPECS`, `GRID_MAP`, equivalents, `computeCarbon`).

**Prerequisite (flag to user):** the vendoring steps (Tasks 1–2) need `npm` and one-time network access to the npm registry. Everything after is offline. Branch `feature/presentation-deck` is already checked out with the spec committed.

---

## File Structure

```
presentation/
  index.html                 # the deck: reveal markup + inline theme <style> + per-slide <aside class="notes">
  reveal/
    dist/reset.css           # vendored
    dist/reveal.css          # vendored
    dist/reveal.js           # vendored (UMD)
    plugin/notes/notes.js    # vendored (speaker-view plugin)
    plugin/notes/notes.html  # vendored (speaker-view popup window)
  fonts/
    space-grotesk-latin-400-normal.woff2
    space-grotesk-latin-500-normal.woff2
    space-grotesk-latin-700-normal.woff2
    space-mono-latin-400-normal.woff2
    space-mono-latin-700-normal.woff2
    fonts.css                # @font-face declarations pointing at the woff2 above
  README.md                  # how to present (S = speaker view) + export PDF (?print-pdf) + re-vendor notes
```

Responsibilities: `index.html` is the only authored file (theme + all slides). `reveal/` and `fonts/` are vendored static assets, never hand-edited. `README.md` documents presenting/exporting/re-vendoring.

---

## Task 1: Vendor reveal.js (offline core + notes plugin)

**Files:**
- Create: `presentation/reveal/dist/{reset.css,reveal.css,reveal.js}`
- Create: `presentation/reveal/plugin/notes/{notes.js,notes.html}`

- [ ] **Step 1: Fetch the reveal.js package into /tmp (network)**

```bash
cd /tmp && rm -rf reveal-vendor && mkdir reveal-vendor && cd reveal-vendor
npm pack reveal.js@5.1.0
tar xzf reveal.js-5.1.0.tgz   # extracts to ./package/
ls package/dist/reveal.js package/dist/reveal.css package/dist/reset.css package/plugin/notes/notes.js package/plugin/notes/notes.html
```
Expected: all five paths listed, no "No such file".

- [ ] **Step 2: Copy the needed files into the repo**

```bash
REPO="$(cd /Users/biancavillavicencio/Downloads/ai-carbon-calculator/files && git rev-parse --show-toplevel)"
mkdir -p "$REPO/presentation/reveal/dist" "$REPO/presentation/reveal/plugin/notes"
cp /tmp/reveal-vendor/package/dist/reset.css  "$REPO/presentation/reveal/dist/"
cp /tmp/reveal-vendor/package/dist/reveal.css "$REPO/presentation/reveal/dist/"
cp /tmp/reveal-vendor/package/dist/reveal.js  "$REPO/presentation/reveal/dist/"
cp /tmp/reveal-vendor/package/plugin/notes/notes.js   "$REPO/presentation/reveal/plugin/notes/"
cp /tmp/reveal-vendor/package/plugin/notes/notes.html  "$REPO/presentation/reveal/plugin/notes/"
```

- [ ] **Step 3: Verify the vendored files exist and are non-empty**

```bash
cd "$(git rev-parse --show-toplevel)"
for f in presentation/reveal/dist/reset.css presentation/reveal/dist/reveal.css presentation/reveal/dist/reveal.js presentation/reveal/plugin/notes/notes.js presentation/reveal/plugin/notes/notes.html; do
  [ -s "$f" ] && echo "OK  $f ($(wc -c <"$f") bytes)" || echo "MISSING/EMPTY $f"
done
```
Expected: five `OK` lines, each with a non-zero byte count (reveal.js is ~300–400 KB).

- [ ] **Step 4: Confirm `.gitignore` won't swallow the vendor dir**

```bash
cd "$(git rev-parse --show-toplevel)"
git check-ignore presentation/reveal/dist/reveal.js || echo "NOT IGNORED — good"
```
Expected: prints `NOT IGNORED — good` (the repo `.gitignore` lists `node_modules/`, `*.zip`, `*.log`, `.claude/` etc.; none match `presentation/`).

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/reveal
git commit -m "Vendor reveal.js 5.1.0 (core + notes plugin) for the deck"
```

---

## Task 2: Vendor fonts + write fonts.css

**Files:**
- Create: `presentation/fonts/*.woff2` (5 files)
- Create: `presentation/fonts/fonts.css`

- [ ] **Step 1: Fetch the fontsource packages into /tmp (network)**

```bash
cd /tmp && rm -rf font-vendor && mkdir font-vendor && cd font-vendor
npm pack @fontsource/space-grotesk@5 && tar xzf fontsource-space-grotesk-*.tgz && mv package grotesk
npm pack @fontsource/space-mono@5    && tar xzf fontsource-space-mono-*.tgz    && mv package mono
ls grotesk/files/space-grotesk-latin-400-normal.woff2 mono/files/space-mono-latin-400-normal.woff2
```
Expected: both paths listed (fontsource v5 stores woff2 under `files/`).

- [ ] **Step 2: Copy the specific weights into the repo**

```bash
REPO="$(cd /Users/biancavillavicencio/Downloads/ai-carbon-calculator/files && git rev-parse --show-toplevel)"
mkdir -p "$REPO/presentation/fonts"
cp /tmp/font-vendor/grotesk/files/space-grotesk-latin-400-normal.woff2 "$REPO/presentation/fonts/"
cp /tmp/font-vendor/grotesk/files/space-grotesk-latin-500-normal.woff2 "$REPO/presentation/fonts/"
cp /tmp/font-vendor/grotesk/files/space-grotesk-latin-700-normal.woff2 "$REPO/presentation/fonts/"
cp /tmp/font-vendor/mono/files/space-mono-latin-400-normal.woff2       "$REPO/presentation/fonts/"
cp /tmp/font-vendor/mono/files/space-mono-latin-700-normal.woff2       "$REPO/presentation/fonts/"
```
(If a `-500-` Grotesk file is absent in the package, drop that one copy line and remove its `@font-face` block in Step 3 — 400/700 are sufficient.)

- [ ] **Step 3: Create `presentation/fonts/fonts.css`**

```css
/* Vendored @fontsource files — Space Grotesk (headings/prose) + Space Mono (code/labels). */
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:400;font-display:swap;
  src:url('./space-grotesk-latin-400-normal.woff2') format('woff2');}
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500;font-display:swap;
  src:url('./space-grotesk-latin-500-normal.woff2') format('woff2');}
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:700;font-display:swap;
  src:url('./space-grotesk-latin-700-normal.woff2') format('woff2');}
@font-face{font-family:'Space Mono';font-style:normal;font-weight:400;font-display:swap;
  src:url('./space-mono-latin-400-normal.woff2') format('woff2');}
@font-face{font-family:'Space Mono';font-style:normal;font-weight:700;font-display:swap;
  src:url('./space-mono-latin-700-normal.woff2') format('woff2');}
```

- [ ] **Step 4: Verify**

```bash
cd "$(git rev-parse --show-toplevel)"
ls -l presentation/fonts/*.woff2 | wc -l          # expect 5 (or 4 if -500- dropped)
[ -s presentation/fonts/fonts.css ] && echo "fonts.css OK"
```

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/fonts
git commit -m "Vendor Space Grotesk + Space Mono woff2 + fonts.css"
```

---

## Task 3: Deck skeleton + theme CSS + reveal init

Builds `index.html` with the head, the full inline theme, two probe slides (one title-style, one with a `<aside class="notes">`), and the reveal initialisation. This proves the theme, fonts, progress bar, and speaker view work before content goes in.

**Files:**
- Create: `presentation/index.html`

- [ ] **Step 1: Create `presentation/index.html` with head + theme + probe slides + init**

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Carbon Calculator — how it works</title>
<link rel="stylesheet" href="reveal/dist/reset.css">
<link rel="stylesheet" href="reveal/dist/reveal.css">
<link rel="stylesheet" href="fonts/fonts.css">
<style>
/* ── App design tokens (verbatim from index.html :root, dark theme) ── */
:root{
  --bg:#0d1117; --surface:#161b22; --surface2:#1c2330; --border:#444c56;
  --green:#3fb950; --green-dim:#122d1a; --amber:#e3b341; --red:#ff7b72;
  --blue:#79b8ff; --purple:#bc8cff; --text:#e6edf3; --muted:#b1bac4; --dim:#8b949e;
  --teal:#2fd4c6; --orange:#ff9d3c; --pink:#ff8ad4; --focus:#79c0ff;
  --mono:'Space Mono',monospace; --sans:'Space Grotesk',sans-serif;
}
/* ── Reveal base ── */
.reveal{font-family:var(--sans);color:var(--text);font-size:30px;}
.reveal .slides{text-align:left;}
.reveal .slides section{height:100%;}
html,body{background:var(--bg);}
.reveal h1,.reveal h2,.reveal h3{font-family:var(--sans);color:var(--text);
  font-weight:700;text-transform:none;letter-spacing:-0.01em;margin:0 0 18px;line-height:1.1;}
.reveal h1{font-size:1.9em;} .reveal h2{font-size:1.4em;} .reveal h3{font-size:1.05em;}
.reveal p,.reveal li{color:var(--text);line-height:1.45;}
.reveal strong{color:var(--text);font-weight:700;}
.reveal em{color:var(--muted);font-style:normal;}
.reveal a{color:var(--blue);}
.reveal ul{margin-left:1em;} .reveal li{margin:0.35em 0;}
/* ── Signature mono-uppercase section label (app .clabel) ── */
.sec-label{font-family:var(--mono);font-size:0.5em;letter-spacing:.16em;text-transform:uppercase;
  color:var(--green);margin-bottom:14px;}
.muted{color:var(--muted);} .small{font-size:0.7em;}
.cap{font-size:0.62em;color:var(--muted);font-family:var(--mono);margin-top:10px;}
/* ── Cards (app surface/border aesthetic) ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;
  padding:18px 20px;margin:10px 0;}
.cards{display:grid;gap:14px;} .cards.two{grid-template-columns:1fr 1fr;}
.ckey{font-family:var(--mono);font-size:0.52em;letter-spacing:.1em;text-transform:uppercase;
  color:var(--green);margin-bottom:6px;}
/* ── Big headline number (app impact colour) ── */
.headline{font-family:var(--mono);font-weight:700;color:var(--green);font-size:2.2em;line-height:1;}
/* ── Ledger / equation trace (app #eqbox) ── */
.ledger{font-family:var(--mono);font-size:0.62em;background:var(--surface2);
  border:1px solid var(--border);border-radius:8px;padding:14px 16px;}
.ledger .row{display:flex;justify-content:space-between;gap:18px;padding:5px 0;
  border-bottom:1px solid var(--border);}
.ledger .row:last-child{border-bottom:none;}
.ledger .val{color:var(--green);}
.ledger .tag{font-size:0.8em;color:var(--muted);}
/* ── Confidence bars (app pattern) ── */
.conf{margin:8px 0;font-family:var(--mono);font-size:0.55em;}
.conf .lab{display:flex;justify-content:space-between;color:var(--muted);margin-bottom:3px;}
.conf .track{height:8px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;overflow:hidden;}
.conf .fill{height:100%;background:var(--green);}
/* ── Equivalents accents (deliberately distinct from semantic colours) ── */
.eq-teal{color:var(--teal);} .eq-orange{color:var(--orange);} .eq-pink{color:var(--pink);}
.eqgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;}
.eqgrid .big{font-family:var(--mono);font-weight:700;font-size:1.7em;}
/* token split colours */
.in-tok{color:var(--blue);} .out-tok{color:var(--purple);}
/* ── Code blocks: plain mono on surface2 (app shows code/ledger uncoloured) ── */
.reveal pre{box-shadow:none;width:100%;margin:10px 0;font-size:0.5em;}
.reveal pre code{font-family:var(--mono);background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:14px 16px;color:var(--text);max-height:none;line-height:1.4;}
.reveal code{font-family:var(--mono);color:var(--green);}
.reveal pre code .cmt{color:var(--dim);}
/* ── Section-divider slide ── */
.divider{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;height:100%;}
.divider .pill{font-family:var(--mono);font-size:0.55em;letter-spacing:.18em;text-transform:uppercase;
  color:var(--green);background:var(--green-dim);border-radius:20px;padding:6px 16px;margin-bottom:18px;}
.divider h2{font-size:1.9em;}
/* ── Flow diagram (mental model) ── */
.flow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:var(--mono);font-size:0.6em;}
.flow .node{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px;}
.flow .arrow{color:var(--green);font-size:1.3em;}
/* ── Green progress bar (app wizard bar) ── */
.reveal .progress{color:var(--green);height:4px;}
.reveal .progress span{background:var(--green);}
.reveal .slide-number{background:transparent;color:var(--muted);font-family:var(--mono);font-size:14px;}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;}
</style>
</head>
<body>
<div class="reveal"><div class="slides">

  <section data-state="probe-title">
    <div class="divider">
      <span class="pill">probe</span>
      <h1>Theme probe</h1>
      <p class="muted">If this is Space Grotesk on near-black with a green pill, the theme + fonts load.</p>
    </div>
  </section>

  <section>
    <div class="sec-label">probe · speaker view</div>
    <h2>Press <code>S</code> for speaker view</h2>
    <p>You should see notes, a timer, and a next-slide preview in a popup window.</p>
    <aside class="notes">If you can read this in the speaker window, the notes plugin works. Allow popups for file URLs.</aside>
  </section>

</div></div>
<script src="reveal/dist/reveal.js"></script>
<script src="reveal/plugin/notes/notes.js"></script>
<script>
Reveal.initialize({
  hash:true, progress:true, slideNumber:'c/t', controls:true,
  transition:'fade', transitionSpeed:'fast', width:1280, height:720, margin:0.06,
  plugins:[ RevealNotes ]
});
</script>
</body>
</html>
```

- [ ] **Step 2: Open the deck and verify the theme + fonts + speaker view**

```bash
open "$(git rev-parse --show-toplevel)/presentation/index.html"
```
Verify by eye:
- Slide 1: near-black `#0d1117` background, white Space Grotesk heading, a green rounded "PROBE" pill.
- A thin green progress bar at the bottom; mono slide number bottom-right.
- Press `S` → a speaker window opens showing the note text + timer + next-slide preview.
- Arrow keys move between the two slides.

- [ ] **Step 3: Verify it works offline (no CDN leaked in)**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -nE "https?://(cdn|unpkg|jsdelivr|fonts\.googleapis|fonts\.gstatic)" presentation/index.html presentation/fonts/fonts.css || echo "NO EXTERNAL URLS — offline-safe"
```
Expected: `NO EXTERNAL URLS — offline-safe`.

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/index.html
git commit -m "Deck skeleton: app-themed reveal init + probe slides + speaker view"
```

---

## Task 4: Slides 1–6 — Open + Pillar I (the logic of the choices)

Replace the two probe `<section>`s with the title, the question, a Pillar-I divider, and slides 3–6. Keep the `<script>` block unchanged.

**Files:**
- Modify: `presentation/index.html` (replace the two probe `<section>` elements inside `.slides`)

- [ ] **Step 1: Replace the probe sections with slides 1–6**

```html
  <!-- 1 · TITLE -->
  <section>
    <div class="divider">
      <span class="pill">AI Carbon Calculator</span>
      <h1>What does your AI use<br>cost the planet?</h1>
      <p class="muted">The logic, the bases, and the deployment of a footprint estimator.</p>
      <p class="cap">Bianca Villavicencio · TELUS Digital · 2026-06-16</p>
    </div>
    <aside class="notes">Title. One line: "This is a tour of a small tool that estimates the monthly carbon footprint of personal AI use — and more interestingly, the reasoning and the deployment story behind it." Set the frame: three parts — the choices, the bases (the math + data), and getting it live on gizmos. ~30s.</aside>
  </section>

  <!-- 2 · THE QUESTION -->
  <section>
    <div class="sec-label">the problem</div>
    <h2>Nobody actually knows their number</h2>
    <ul>
      <li>Providers don't disclose per-query energy, water, or training amortisation.</li>
      <li>"AI is bad for the environment" is a vibe, not a number you can act on.</li>
      <li>Goal: a <strong>defensible estimate</strong> from inputs a normal person can answer — and show the working.</li>
    </ul>
    <p class="cap">Live: ai-carbon-footprint.telus.gizmos.run · public mirror: bvillav-a11y.github.io/ai-carbon-calculator</p>
    <aside class="notes">The motivation. Emphasise the gap: people feel guilty or dismissive, neither is grounded. The bar we set ourselves: defensible, transparent, and driven by answers a non-expert can give. Mention it's live on gizmos internally and mirrored on GitHub Pages. ~45s.</aside>
  </section>

  <!-- DIVIDER · PILLAR I -->
  <section>
    <div class="divider"><span class="pill">Pillar I</span><h2>The logic of the choices</h2></div>
    <aside class="notes">Transition. "First, the product reasoning — why the tool is shaped the way it is." ~10s.</aside>
  </section>

  <!-- 3 · MENTAL MODEL -->
  <section>
    <div class="sec-label">the mental model</div>
    <h2>One pipeline, four stages</h2>
    <div class="flow">
      <span class="node">survey answers</span><span class="arrow">→</span>
      <span class="node">inferred parameters</span><span class="arrow">→</span>
      <span class="node">carbon math</span><span class="arrow">→</span>
      <span class="node">tangible equivalents</span>
    </div>
    <p class="small muted" style="margin-top:22px">Everything downstream is a pure function of the inferred parameters, so any value can be overridden and the whole chain re-renders live.</p>
    <aside class="notes">This is the spine of the whole app — keep coming back to it. Plain-language answers become physical parameters; parameters feed one math function; the kg result is translated into things people feel. The key engineering property: it's a one-way pure pipeline, so "what-if" is free — change an input, everything recomputes. ~50s.</aside>
  </section>

  <!-- 4 · WHY A SURVEY -->
  <section>
    <div class="sec-label">choice · inputs</div>
    <h2>A survey, not a parameter form</h2>
    <div class="cards two">
      <div class="card"><div class="ckey">you ask</div>"How complex are your tasks?"<br>"Cloud or on-prem?"<br>"Interactive or batch?"</div>
      <div class="card"><div class="ckey">you infer</div>task complexity → <strong>model tier</strong><br>hardware type → <strong>PUE</strong><br>interactivity + frequency → <strong>utilisation</strong></div>
    </div>
    <p class="small muted" style="margin-top:16px">Nobody knows their PUE. Everybody knows whether they run batch jobs or chat.</p>
    <aside class="notes">The core product bet: meet people where they are. Asking for PUE or utilisation directly would lose everyone. So we map answerable questions onto the physical parameters. Note the deliberate decoupling: task complexity drives the model tier; interactivity feeds utilisation, NOT the tier. Each inference also stores a reason string, surfaced as a tooltip on the matching control. ~55s.</aside>
  </section>

  <!-- 5 · OUTCOME-FIRST UX -->
  <section>
    <div class="sec-label">choice · layout</div>
    <h2>Outcome first, knobs last</h2>
    <ul>
      <li><strong>Results</strong> — the number + tangible equivalents, immediately.</li>
      <li><strong>Insights &amp; actions</strong> — right-size your model, cleaner grid, concrete cuts.</li>
      <li><strong>More information</strong> — parameters, calculation trace, confidence, sources — all collapsed.</li>
    </ul>
    <p class="small muted" style="margin-top:16px">Most people want the answer and what to do about it. Experts can open every knob.</p>
    <aside class="notes">Progressive disclosure. The old design led with a parameter form; we flipped it. Land on the outcome, then "here's what you can do," then — for the curious — the full machinery behind four collapsibles under a "More information" header. This is also where engagement telemetry lives: we record which of those menus people actually open. ~50s.</aside>
  </section>

  <!-- 6 · CREDIBILITY BY DESIGN -->
  <section>
    <div class="sec-label">choice · trust</div>
    <h2>Credibility is a feature</h2>
    <div class="cards two">
      <div class="card"><div class="ckey">every assumption</div>editable <em>and</em> sourced — with a confidence bar per factor.</div>
      <div class="card"><div class="ckey">honest by default</div>"This is probably an underestimate" — we say what's excluded.</div>
    </div>
    <p class="small muted" style="margin-top:16px">Reserved impact-colour (neutral scenario tiers) · WCAG 2.1 AA · ARIA radio-groups + live regions.</p>
    <aside class="notes">For a sceptical technical audience, trust is the product. Three moves: (1) every number is both editable and cited, with an explicit confidence level; (2) we proactively state the estimate is conservative and list what's left out; (3) accessibility is maintained, not bolted on — ARIA patterns, keyboard nav, AA contrast (several palette colours were lifted specifically to pass AA). ~55s.</aside>
  </section>
```

- [ ] **Step 2: Verify**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -c "<section" presentation/index.html   # expect 6
open presentation/index.html
```
Arrow through all 6: title → problem → Pillar-I divider → mental-model flow → survey → outcome-first → credibility. Confirm the flow diagram arrows are green, cards render on `--surface`, every slide has a green mono section label or pill. Press `S` and confirm notes appear for each.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/index.html
git commit -m "Deck slides 1-6: open + Pillar I (logic of the choices)"
```

---

## Task 5: Slides 7–13 — Pillar II (the bases: math + data)

Append these `<section>`s after slide 6 (before the closing `</div></div>` of `.slides`). All figures are verbatim from `index.html` constants — do not round or invent.

**Files:**
- Modify: `presentation/index.html` (append slides 7–13 inside `.slides`)

- [ ] **Step 1: Append slides 7–13**

```html
  <!-- DIVIDER · PILLAR II -->
  <section>
    <div class="divider"><span class="pill">Pillar II</span><h2>The bases: the math &amp; the data</h2></div>
    <aside class="notes">Transition into the rigour. "Now the part a technical audience actually wants — what's under the number." ~10s.</aside>
  </section>

  <!-- 7 · THE CALCULATION CHAIN -->
  <section>
    <div class="sec-label">computeCarbon()</div>
    <h2>The chain, as a ledger</h2>
    <div class="ledger">
      <div class="row"><span>raw energy = inTok·in_kWh/kTok + outTok·out_kWh/kTok</span><span class="val">kWh</span></div>
      <div class="row"><span>÷ utilisation</span><span class="val">kWh</span></div>
      <div class="row"><span>× PUE</span><span class="val">kWh</span></div>
      <div class="row"><span>× grid g/kWh</span><span class="val">operational kg</span></div>
      <div class="row"><span>+ embodied <span class="tag">GPU manufacture, amortised</span></span><span class="val">kg</span></div>
      <div class="row"><span><strong>= total kg CO₂</strong></span><span class="val">total</span></div>
    </div>
    <p class="cap">One pure function. The on-screen "calculation trace" renders exactly these rows.</p>
    <aside class="notes">Walk each line slowly — this is the meatiest slide. Energy starts per-token, split input vs output. Divide by utilisation (idle GPUs still draw power). Multiply by PUE (data-centre overhead). Multiply by grid intensity to turn kWh into kg. Add amortised embodied carbon. The on-screen ledger in the app mirrors this row for row — the math is never hidden. ~90s; this slide can run long, that's fine.</aside>
  </section>

  <!-- 8 · ENERGY PER TOKEN -->
  <section>
    <div class="sec-label">MODEL_SPECS · kWh per 1k tokens</div>
    <h2>Output costs ~5× input</h2>
    <div class="ledger">
      <div class="row"><span>Claude Haiku</span><span><span class="in-tok">in 0.000090</span> · <span class="out-tok">out 0.000450</span></span></div>
      <div class="row"><span>Claude Sonnet</span><span><span class="in-tok">in 0.000390</span> · <span class="out-tok">out 0.001950</span></span></div>
      <div class="row"><span>Claude Opus</span><span><span class="in-tok">in 0.000780</span> · <span class="out-tok">out 0.003900</span></span></div>
    </div>
    <p class="small" style="margin-top:14px"><span class="in-tok">■ input</span> — cheap, parallel · <span class="out-tok">■ output</span> — generated one token at a time, ~5× costlier</p>
    <p class="cap">Source: Epoch AI — "How much energy does ChatGPT use?" (Sonnet ≈ GPT-4o class).</p>
    <aside class="notes">Two points. First, energy is per-token and asymmetric — output is autoregressive (one token at a time) so it's roughly 5× input; that's why "ask for concise answers" is a real lever. Second, tiers scale ~linearly Haiku→Sonnet→Opus, which is what makes "right-size your model" a genuine carbon decision, not a rounding error. Numbers are grounded in Epoch AI's public estimates. ~60s.</aside>
  </section>

  <!-- 9 · HARDWARE & OVERHEAD -->
  <section>
    <div class="sec-label">GPU_SPECS · PUE · utilisation</div>
    <h2>Where the watts leak</h2>
    <div class="cards">
      <div class="card"><div class="ckey">gpu</div>H100 700W · A100 700→400W · embodied 130–225 kg CO₂ per card</div>
      <div class="card"><div class="ckey">pue</div>1.2 hyperscaler · 1.4 typical cloud · 2.0+ on-prem — multiplies IT energy by overhead</div>
      <div class="card"><div class="ckey">utilisation</div>energy per <em>useful</em> token scales as <strong>1 ÷ utilisation</strong> — idle silicon still burns</div>
    </div>
    <aside class="notes">Three multipliers people never see. GPU choice sets the power draw and carries embodied carbon. PUE is the tax for cooling and networking — 1.4 means 40% on top. Utilisation is the sneaky one: a half-idle GPU doubles the energy attributed to each real token, which is exactly why interactive use is dirtier per token than batch. ~60s.</aside>
  </section>

  <!-- 10 · THE GRID -->
  <section>
    <div class="sec-label">GRID_MAP · g CO₂ / kWh</div>
    <h2>The grid often decides it</h2>
    <div class="ledger">
      <div class="row"><span>🇨🇦 Canada BC (hydro)</span><span class="val">15</span></div>
      <div class="row"><span>🇫🇷 France (nuclear)</span><span class="val">60</span></div>
      <div class="row"><span>🇧🇷 Brazil</span><span class="val">136</span></div>
      <div class="row"><span>🇺🇸 US average</span><span class="val">400</span></div>
      <div class="row"><span>🇵🇱 Poland (coal)</span><span class="val">700</span></div>
    </div>
    <p class="small muted" style="margin-top:14px">~47× spread, end to end. Insight fires when grid &gt; <code>150</code>: "a cleaner grid (~<code>50</code>) would cut X%."</p>
    <aside class="notes">The single biggest swing in the whole model. Same tokens, same hardware: a BC-hydro grid versus Polish coal differ by ~47×. So the app's biggest lever isn't the model — it's where the data centre is. That's why one of the personalised insights is grid-based: above 150 g we compute the saving against a ~50 g hydro/nuclear reference. ~55s.</aside>
  </section>

  <!-- 11 · EMBODIED CARBON -->
  <section>
    <div class="sec-label">embodied</div>
    <h2>The carbon you already spent</h2>
    <pre><code>embodied_kg = gpuCo2 / (gpuTok · gpuLife · 12) · tokens
<span class="cmt">// e.g. 150 kg / (50M · 4yr · 12mo) · your tokens</span></code></pre>
    <p class="small muted">Manufacturing CO₂ amortised over the GPU's lifetime token throughput. Small next to operational — but counted, because honesty.</p>
    <aside class="notes">Most footprint tools ignore embodied carbon entirely. We amortise the chip's manufacturing emissions across all the tokens it will ever serve, then attribute your slice. It's usually small versus operational energy — but including it is part of being defensible rather than convenient, and it's adjustable in the advanced panel. ~45s.</aside>
  </section>

  <!-- 12 · KG TO MEANING -->
  <section>
    <div class="sec-label">tangible equivalents</div>
    <h2>From kg to something you feel</h2>
    <div class="eqgrid">
      <div><div class="big eq-orange">6 km</div><div class="cap">driven per kg CO₂</div></div>
      <div><div class="big eq-teal">22 kg</div><div class="cap">absorbed / tree / year</div></div>
      <div><div class="big eq-pink">$50</div><div class="cap">social cost / tonne</div></div>
    </div>
    <p class="small muted" style="margin-top:18px">Each equivalent gets its own accent colour — deliberately distinct from every semantic colour in the math.</p>
    <aside class="notes">A kilogram of CO₂ is meaningless to most people. So we translate: kilometres driven, trees-years to offset, dollars of social cost. Note the colour discipline — these three accents (orange/teal/pink) are reserved exclusively for equivalents, never reused for a parameter, so the eye learns "this colour = a real-world analogy." ~45s.</aside>
  </section>

  <!-- 13 · HONESTY ABOUT UNCERTAINTY -->
  <section>
    <div class="sec-label">confidence &amp; what's excluded</div>
    <h2>Say what you don't know</h2>
    <div class="conf"><div class="lab"><span>Energy per token</span><span>med</span></div><div class="track"><div class="fill" style="width:60%"></div></div></div>
    <div class="conf"><div class="lab"><span>PUE (inferred, undisclosed)</span><span>low–med</span></div><div class="track"><div class="fill" style="width:55%"></div></div></div>
    <div class="conf"><div class="lab"><span>Grid intensity</span><span>high</span></div><div class="track"><div class="fill" style="width:80%"></div></div></div>
    <p class="small muted" style="margin-top:14px">Excluded: training amortisation · networking · cooling water · non-GPU embodied. <code>computeCarbon</code> is one pure function — the scenario tiers just call it with a different model.</p>
    <aside class="notes">Close the rigour section on humility. Each factor carries a confidence level — grid is well-measured, PUE is inferred and uncertain. We list the big exclusions explicitly so nobody thinks the number is complete. And the engineering punchline: because computeCarbon is a single pure function, the Haiku/Sonnet/Opus scenario comparison is literally the same function called three times — no duplicated math to drift. ~55s.</aside>
  </section>
```

- [ ] **Step 2: Verify**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -c "<section" presentation/index.html   # expect 14 (6 + 8 new: divider + 7 content)
open presentation/index.html
```
Arrow from the Pillar-II divider through slide 13. Confirm: the ledger rows render with green right-aligned values; the token-split uses blue (input) / purple (output); the grid table shows 15→700; the equivalents use orange/teal/pink; confidence bars fill green. Spot-check that the `MODEL_SPECS` numbers on slide 8 match `index.html` (in 0.000090/0.000390/0.000780, out 0.000450/0.001950/0.003900).

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/index.html
git commit -m "Deck slides 7-13: Pillar II (the math + the data)"
```

---

## Task 6: Slides 14–18 — Pillar III (the deployment process)

Append after slide 13.

**Files:**
- Modify: `presentation/index.html` (append slides 14–18 inside `.slides`)

- [ ] **Step 1: Append slides 14–18**

```html
  <!-- DIVIDER · PILLAR III -->
  <section>
    <div class="divider"><span class="pill">Pillar III</span><h2>The process of deployment</h2></div>
    <aside class="notes">Transition to the war-stories. "Now how it actually got live — and everything that fought back." ~10s.</aside>
  </section>

  <!-- 14 · TWO HOMES -->
  <section>
    <div class="sec-label">where it lives</div>
    <h2>Two targets, one source file</h2>
    <div class="cards two">
      <div class="card"><div class="ckey">GitHub Pages</div>public demo · serves <code>index.html</code> directly · <code>/collect</code> 404s, collection no-ops</div>
      <div class="card"><div class="ckey">TELUS gizmos</div>the real home · same Worker serves the app <em>and</em> a same-origin <code>POST /collect</code> → per-app D1</div>
    </div>
    <p class="cap">The entire calculator is one <code>index.html</code> — HTML + one CSS block + one vanilla JS block. No framework.</p>
    <aside class="notes">Set up the deployment shape. The calculator is a single no-framework index.html, which makes the public mirror trivial. The interesting target is gizmos — TELUS's internal app platform — where the same file is served by a Worker that also collects anonymous survey data into a per-app SQLite (D1) database. The constraint that everything is one HTML file drives the whole embed story coming up. ~50s.</aside>
  </section>

  <!-- 15 · GIZMOS ARCHITECTURE -->
  <section>
    <div class="sec-label">gizmos · architecture</div>
    <h2>One plain Worker does everything</h2>
    <pre><code>GET  /         → serve base64-embedded index.html
POST /collect  → upsert survey row into D1 (by sessionId)
GET  /export   → CSV dump of responses</code></pre>
    <p class="small muted">Per-app D1 auto-provisioned · table created lazily (<code>CREATE TABLE IF NOT EXISTS</code>) · consent-gated.</p>
    <aside class="notes">The shipped architecture, deliberately minimal. One Worker, three routes. The HTML is embedded in the Worker as a base64 string. Collection is a same-origin POST, upserting by session id so re-runs update one row. Export is a CSV endpoint we use to verify data, because the platform's DB CLI needs a browser session. Now — why does it look like this? Because three things broke first. ~50s.</aside>
  </section>

  <!-- 16 · WAR-STORIES -->
  <section>
    <div class="sec-label">what fought back</div>
    <h2>Three platform lessons</h2>
    <div class="cards">
      <div class="card"><div class="ckey">1 · module load</div>a bare <code>import 'hono'</code> → <strong>500 on load</strong>, empty logs → rewrite as a plain Workers module, no imports</div>
      <div class="card"><div class="ckey">2 · reserved path</div><code>/api/*</code> is platform-reserved → app POSTs <strong>silently blocked</strong> → move to <code>/collect</code> &amp; <code>/export</code></div>
      <div class="card"><div class="ckey">3 · cross-origin auth</div>Apps-Script POSTs <strong>dropped the auth cookie</strong> (3rd-party-cookie stripping) → pivot to <em>same-origin</em> collection</div>
    </div>
    <aside class="notes">The fun slide — tell these as stories. (1) The deploy 500'd with empty logs; bisection showed the loader won't resolve a bare hono import at runtime, so any framework worker dies on load — fix was a plain Workers module with zero imports. (2) Collection POSTs vanished; turns out /api/* is reserved by the platform and app POSTs to it are blocked — renaming to /collect fixed it instantly. (3) The original plan POSTed to a Google Apps Script, but background cross-origin requests get their auth cookie stripped, so it silently 401'd — which is the whole reason collection became same-origin. Each failure shaped the architecture on the last two slides. ~90s.</aside>
  </section>

  <!-- 17 · EMBED PIPELINE -->
  <section>
    <div class="sec-label">build · embed.mjs</div>
    <h2>One source file, regenerated</h2>
    <pre><code>index.html  +  worker.template.ts
      │  node scripts/embed.mjs   <span class="cmt">// base64-inline the HTML</span>
      ▼
gizmos-app/src/index.ts  →  gizmos push --org telus</code></pre>
    <p class="small muted">Base64, not a template literal — the inline <code>&lt;script&gt;</code> is full of backticks and <code>${...}</code>. Regenerate after <em>every</em> edit.</p>
    <aside class="notes">How a change ships. index.html stays the single source of truth; a small build step base64-encodes it into the Worker template, producing the deployable file we push. Why base64 and not a JS template string? The app's inline script is full of backticks and dollar-brace — it would shred a template literal. The one discipline: re-run embed after any HTML change, or you deploy stale. ~45s.</aside>
  </section>

  <!-- 18 · COLLECTION & TELEMETRY -->
  <section>
    <div class="sec-label">collection · telemetry</div>
    <h2>Anonymous, consent-gated, one row per visit</h2>
    <ul>
      <li>Upsert by <code>sessionId</code>; baseline frozen at first results render.</li>
      <li>Engagement: <code>dwell_ms</code>, which menus opened, share, retake.</li>
      <li>Schema evolves via best-effort <code>ALTER TABLE … ADD COLUMN</code> on an existing table.</li>
    </ul>
    <aside class="notes">What we learn and how. Only anonymous signals — the survey answers, the computed number, and engagement: how long on results, which "More information" menus they opened, whether they shared or retook. All consent-gated, one upserted row per session. The schema note matters for the next slide's lesson: the prod table predates the telemetry columns, so the Worker runs idempotent ALTER TABLE migrations to add them — CREATE IF NOT EXISTS won't touch an existing table. ~55s.</aside>
  </section>
```

- [ ] **Step 2: Verify**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -c "<section" presentation/index.html   # expect 20 (14 + 6 new: divider + 5 content)
open presentation/index.html
```
Arrow from the Pillar-III divider through slide 18. Confirm the three route lines and the embed pipeline render as mono code blocks on `--surface2`; the war-stories show as three numbered cards. Check notes on `S`.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/index.html
git commit -m "Deck slides 14-18: Pillar III (deployment process + war-stories)"
```

---

## Task 7: Slides 19–20 — Close (takeaways + end)

Append after slide 18 — the last content before `</div></div>`.

**Files:**
- Modify: `presentation/index.html` (append slides 19–20 inside `.slides`)

- [ ] **Step 1: Append slides 19–20**

```html
  <!-- 19 · TAKEAWAYS -->
  <section>
    <div class="sec-label">what to steal</div>
    <h2>Four things that generalise</h2>
    <ul>
      <li><strong>Platform constraints shape architecture</strong> — the plain Worker + same-origin collection are scars, not preferences.</li>
      <li><strong>Ship the schema <em>and</em> its migration together</strong> — <code>CREATE IF NOT EXISTS</code> never alters a live table.</li>
      <li><strong>Transparency is a feature</strong> — editable, sourced, confidence-rated beats a confident black box.</li>
      <li><strong>Right-size your model</strong> — the app's own advice, applied to how we build.</li>
    </ul>
    <aside class="notes">The portable lessons. One: don't fight the platform — its limits became the design. Two: the migration lesson is the one I'd tattoo — a schema change isn't done until its migration ships with it. Three: for a credibility tool, showing the working IS the product. Four: meta-point — the tool tells users to pick the smallest model that does the job; same applies to our own engineering. ~55s.</aside>
  </section>

  <!-- 20 · END -->
  <section>
    <div class="divider">
      <span class="pill">thank you</span>
      <h2>Questions?</h2>
      <p class="small">App · <code>ai-carbon-footprint.telus.gizmos.run</code></p>
      <p class="small">Code · <code>github.com/bvillav-a11y/ai-carbon-calculator</code></p>
    </div>
    <aside class="notes">Close. Invite questions; offer to walk the live app or the Worker source. Likely Qs: where the per-token numbers come from (Epoch AI), why embodied is included, how gizmos D1 differs from raw D1 (the D1Proxy API). ~10s + Q&A.</aside>
  </section>
```

- [ ] **Step 2: Verify final slide count + full read-through**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -c "<section" presentation/index.html   # expect 22 (20 + 2)
grep -c "<aside class=\"notes\"" presentation/index.html   # expect 22 (every slide has notes)
open presentation/index.html
```
Full pass: all 22 sections present, every slide has a speaker note. Press `ESC` for the overview grid to eyeball pacing.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/index.html
git commit -m "Deck slides 19-20: takeaways + close"
```

---

## Task 8: README + final verification (offline, PDF, figure spot-check)

**Files:**
- Create: `presentation/README.md`

- [ ] **Step 1: Create `presentation/README.md`**

```markdown
# AI Carbon Calculator — talk deck

A ~20-minute reveal.js talk for technical peers. Self-contained and offline (reveal.js + fonts are vendored).

## Present
- Open `presentation/index.html` in a browser.
- Arrow keys / space to navigate; `ESC` for the slide overview.
- **`S` opens the speaker view** — presenter notes, a timer, and the next-slide preview (allow popups for `file://`).

## Export to PDF
- Open `presentation/index.html?print-pdf` and use the browser's Print → Save as PDF (one slide per page).

## Re-vendor assets (only if upgrading)
- reveal.js: `npm pack reveal.js@5.1.0`, copy `dist/{reset,reveal}.css`, `dist/reveal.js`, and `plugin/notes/{notes.js,notes.html}` into `reveal/`.
- fonts: `npm pack @fontsource/space-grotesk @fontsource/space-mono`, copy the woff2 from `files/` into `fonts/`.

## Editing
- All content + theme live in `index.html` (one inline `<style>` + one `<section>` per slide, each with an `<aside class="notes">`). `reveal/` and `fonts/` are vendored — don't hand-edit.
```

- [ ] **Step 2: Offline check — no external URLs anywhere**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -rnE "https?://(cdn|unpkg|jsdelivr|fonts\.googleapis|fonts\.gstatic|cdnjs)" presentation/ || echo "OFFLINE-SAFE: no external asset URLs"
```
Expected: `OFFLINE-SAFE: no external asset URLs` (content links to the app/repo in slide text are fine — this pattern only flags asset CDNs).

- [ ] **Step 3: Figure spot-check against the app constants (no drift)**

```bash
cd "$(git rev-parse --show-toplevel)"
echo "— MODEL_SPECS in app —"; grep -E "haiku:|sonnet:|opus:" index.html | head -3
echo "— equivalents in app —"; grep -E "KM_PER_KG|TREE_KG_YR|CARB_PRICE" index.html
echo "— grid presets in app —"; grep -oE "data-g=\"[0-9]+\"" index.html | sort -u
```
Manually confirm the deck matches: slide 8 in/out kWh (0.000090/0.000450, 0.000390/0.001950, 0.000780/0.003900); slide 12 equivalents (6 km, 22 kg, $50); slide 10 grid values (15/60/136/400/700).

- [ ] **Step 4: Real-browser offline test**

Turn off wifi, reload `presentation/index.html`. Confirm: fonts still render as Space Grotesk/Mono (not a system fallback), slides advance, `S` still opens the speaker view. Re-enable wifi.

- [ ] **Step 5: Timing read-through**

Open the speaker view and read the notes top to bottom at speaking pace. Confirm the total lands in ~18–22 minutes. If long, the notes mark slides 7 and 16 as the ones that may run — trim elsewhere, not there.

- [ ] **Step 6: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add presentation/README.md
git commit -m "Deck README: present/export/re-vendor instructions"
```

---

## Self-Review (completed during planning)

**1. Spec coverage** — every spec section maps to a task:
- Look/feel tokens + motifs → Task 3 (theme CSS: cards, ledger, conf bars, equivalents accents, green progress bar, mono labels). ✓
- File structure (`reveal/`, `fonts/`, `index.html`, `README.md`) → Tasks 1, 2, 3, 8. ✓
- Mechanics (speaker view, PDF, offline, nav) → Task 3 init + Task 8 verification + README. ✓
- All 20 slides with notes → Tasks 4–7 (slides 1–6 / 7–13 / 14–18 / 19–20). ✓
- War-stories trimmed to 3 → Task 6, slide 16. ✓
- Out-of-scope (no deploy, motifs not screenshots, no highlight plugin) → respected; no deploy task, no image assets, Notes-only plugin. ✓
- Verification plan → Task 8. ✓

**2. Placeholder scan** — no TBD/TODO; every code step is complete HTML/CSS/bash. Figures are literal from constants.

**3. Consistency** — CSS class names used in slides (`.sec-label`, `.card`, `.cards.two`, `.ckey`, `.ledger`/`.row`/`.val`/`.tag`, `.conf`/`.track`/`.fill`, `.eqgrid`/`.big`, `.eq-teal/-orange/-pink`, `.in-tok`/`.out-tok`, `.flow`/`.node`/`.arrow`, `.divider`/`.pill`, `.cap`, `.cmt`, `.muted`, `.small`) are all defined in the Task 3 `<style>` block. Section count assertions are cumulative and correct: 6 → 14 → 20 → 22.

**Note on "tests":** a static deck has no automated suite; per-task verification is browser-based (render, notes, offline, figure spot-check), mirroring how `index.html` itself is verified in this repo.
