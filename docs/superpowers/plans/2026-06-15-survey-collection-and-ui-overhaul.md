# Survey Collection + UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anonymous survey-data collection to a Google Sheet (consent-gated) and ship six UI improvements (light/dark theme, semantic colour system, softer tables, re-ordered token question, a model-selection note, removal of the inference screen).

**Architecture:** Everything client-side lives in the single `index.html` (`<style>` + `<script>` blocks). Collection POSTs fire-and-forget to an externally-hosted Google Apps Script Web App that upserts one row per visit into a Sheet. UI work is pure CSS/markup/JS edits to the existing screen pipeline.

**Tech Stack:** Vanilla JS, hand-written CSS (custom properties), no build step, no npm, no test runner. Google Apps Script (server side, hosted at Google).

> **VERIFICATION MODEL (read first).** This repo has *no test framework* by design (see `CLAUDE.md`). The skill's "write a failing test" loop does not apply. Each task therefore verifies via:
> 1. **Syntax check:** `awk '/<script>/{f=1;next}/<\/script>/{f=0}f' index.html > /tmp/check.js && node --check /tmp/check.js` → expect no output (exit 0).
> 2. **Manual browser walkthrough:** `open index.html`, then the specific checks listed in the task.
> 3. **Commit.**
> Anchors below give current line numbers as *hints* — they drift as you edit. Locate by the quoted unique string, not the number.

---

## File structure

- **Modify:** `index.html` — all client changes (CSS in the `<style>` block ~lines 10–430, markup ~440–755, JS in the `<script>` block ~757–1638).
- **Modify:** `README.md` — add a "Data collection" section + Apps Script setup steps.
- **Create (outside repo, documented in README):** the Apps Script `Code.gs` — pasted into script.google.com by the owner.

Collection JS is added as a self-contained block at the end of the `<script>` (a constant + ~5 functions) so it never tangles into `recalc()`.

---

## Task 1: Light/dark theme tokens

**Files:** Modify `index.html` (`:root` block, ~10–29).

- [ ] **Step 1: Add a `--divider` token to the dark `:root`.** After the line `--dim:        #8b949e;` (line ~25) add:

```css
  --divider:   #21262d;        /* low-contrast row separator (less "griddy") */
```

- [ ] **Step 2: Add the light-theme override block.** Immediately after the closing `}` of `:root` (line ~29), insert:

```css
/* ── Light theme — accents darkened for AA 4.5:1 on white ── */
[data-theme="light"] {
  --bg:        #ffffff;
  --surface:   #f6f8fa;
  --surface2:  #eef1f5;
  --border:    #d0d7de;
  --divider:   #eaecef;
  --green:     #1a7f37;
  --green-dim: #dafbe1;
  --amber:     #9a6700;
  --amber-dim: #fff8c5;
  --red:       #cf222e;
  --red-dim:   #ffebe9;
  --blue:      #0969da;
  --purple:    #8250df;
  --text:      #1f2328;
  --muted:     #59636e;
  --dim:       #6e7781;
  --focus:     #0969da;
}
```

- [ ] **Step 3: Syntax check.** Run the awk+`node --check` command. Expected: no output.

- [ ] **Step 4: Manual check.** `open index.html`. In DevTools console run `document.documentElement.setAttribute('data-theme','light')` → page should turn white with dark text and remain readable; rerun with `'dark'` to restore. (No toggle UI yet — that's Task 2.)

- [ ] **Step 5: Commit.**

```bash
git add index.html
git commit -m "Add light-theme CSS tokens and a --divider token"
```

---

## Task 2: Theme toggle button + init

**Files:** Modify `index.html` (intro markup ~440–461; a new `.theme-toggle` CSS rule; new JS near the top of `<script>`).

- [ ] **Step 1: Add the toggle button** inside `#intro`'s `.wiz-shell`, right after `<div class="wiz-eye" aria-hidden="true">// AI Carbon Calculator</div>` (line ~442):

```html
  <button id="themeToggle" class="theme-toggle" type="button"
          aria-label="Switch between light and dark theme" onclick="toggleTheme()">☀️ Light</button>
```

- [ ] **Step 2: Add `.theme-toggle` CSS.** Place it near the other intro styles (anywhere in the `<style>` block, e.g. after the `.wiz-eye` rule). Use tokens only:

```css
.theme-toggle{
  position:absolute; top:16px; right:16px;
  background:var(--surface2); border:1px solid var(--border); color:var(--text);
  border-radius:20px; padding:5px 12px; font-size:13px; font-family:inherit; cursor:pointer;
}
.theme-toggle:hover{ border-color:var(--muted); }
```

Confirm `#intro .wiz-shell` (or `#intro`) is `position:relative` so the absolute toggle anchors to it; if not, add `position:relative;` to the `#intro` rule.

- [ ] **Step 3: Add theme JS** near the very top of the `<script>` block (just after `<script>`, line ~757):

```js
// ── Theme: persisted in localStorage, defaults to OS preference ──
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = t === 'light' ? '🌙 Dark' : '☀️ Light';
  try { localStorage.setItem('theme', t); } catch(e) {}
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'light' ? 'dark' : 'light');
}
(function initTheme(){
  let saved = null; try { saved = localStorage.getItem('theme'); } catch(e) {}
  const sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  applyTheme(saved || sys);
})();
```

- [ ] **Step 4: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 5: Manual check.** `open index.html`. Toggle top-right flips the whole page light↔dark; label updates ("☀️ Light" in dark mode, "🌙 Dark" in light mode); reload preserves the last choice; clearing `localStorage` then reloading honours your OS appearance setting.

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "Add intro light/dark theme toggle with localStorage + OS default"
```

---

## Task 3: Semantic colours — result headline + neutral equivalents

**Files:** Modify `index.html` (result markup ~706–714; `.rnum` CSS; `recalc()` ~1376).

- [ ] **Step 1: Make equivalents neutral; keep an id hook on the headline.** In the `#resultsLive` block (lines ~706–709) and the per-token span (~714), remove the `cg`/`ca`/`cb`/`cr` colour classes from the four result numbers and the per-token number. Result markup becomes:

```html
        <div class="rcell"><div class="rnum" id="r-co2" aria-label="Total kilograms of CO2">—</div><div class="runit">kg CO₂</div><div class="rlbl">total</div></div>
        <div class="rcell"><div class="rnum" id="r-km" aria-label="Equivalent kilometers driven by car">—</div><div class="runit">km driven</div><div class="rlbl">car equiv.</div></div>
        <div class="rcell"><div class="rnum" id="r-trees" aria-label="Trees per year to offset">—</div><div class="runit">trees/yr</div><div class="rlbl">to offset</div></div>
        <div class="rcell"><div class="rnum" id="r-cost" aria-label="Cost in US dollars at $50 per tonne carbon">—</div><div class="runit">USD</div><div class="rlbl">@ $50/t CO₂</div></div>
```

And line ~714: `<span class="rnum" id="r-pertok" ...>` (drop `cg`).

- [ ] **Step 2: Ensure `.rnum` has an explicit neutral colour.** Find the `.rnum` rule in `<style>`; add `color:var(--text);` if not already present.

- [ ] **Step 3: Add impact-tier constant + helper.** In the `<script>`, just above `function recalc()` (line ~1372), add:

```js
// Headline impact tiers (kg CO₂/month). Tunable — calibrate against typical results.
const IMPACT_THRESHOLDS = { low: 2, high: 10 };
function impactColor(kg){
  if (kg < IMPACT_THRESHOLDS.low)  return 'var(--green)';
  if (kg <= IMPACT_THRESHOLDS.high) return 'var(--amber)';
  return 'var(--red)';
}
function impactLabel(kg){
  if (kg < IMPACT_THRESHOLDS.low)  return 'low impact';
  if (kg <= IMPACT_THRESHOLDS.high) return 'medium impact';
  return 'high impact';
}
```

- [ ] **Step 4: Colour the headline in `recalc()`.** Right after `document.getElementById('r-co2').textContent = fmt(r.totalKg, 3);` (line ~1376) add:

```js
  document.getElementById('r-co2').style.color = impactColor(r.totalKg);
  document.getElementById('r-co2').setAttribute('aria-label',
    'Total ' + fmt(r.totalKg,3) + ' kilograms of CO2, ' + impactLabel(r.totalKg));
```

- [ ] **Step 5: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 6: Manual check.** Open the calculator (click "See average results →"). The big kg number is amber at ~average values; drag tokens far down → turns green; far up → turns red. The km/trees/USD/per-token numbers are now neutral (theme text colour), not multicolour.

- [ ] **Step 7: Commit.**

```bash
git add index.html
git commit -m "Colour result headline by impact tier; make equivalents neutral"
```

---

## Task 4: Semantic colours — neutral scenario comparison with magnitude bars

**Files:** Modify `index.html` (`.cmp-*` CSS ~380–383; `CMP_MODELS` + render ~1408–1421).

- [ ] **Step 1: Replace the `.cmp-cell` CSS** with a bar-row layout. Find the `.cmp-cell`, `.cmp-name`, `.cmp-val` rules (~380–383) and replace them with:

```css
.cmp-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:7px;
  font-family:var(--mono);font-size:13px;margin-bottom:6px;}
.cmp-row.you{background:var(--surface2);border:1px solid var(--border);}
.cmp-name{flex:0 0 150px;color:var(--text);}
.cmp-you{font-size:10px;color:var(--blue);border:1px solid var(--blue);border-radius:4px;
  padding:0 5px;margin-left:6px;font-family:var(--sans);}
.cmp-track{flex:1;height:14px;background:var(--surface2);border-radius:3px;overflow:hidden;}
.cmp-bar{height:100%;background:var(--dim);border-radius:3px;}
.cmp-val{flex:0 0 auto;color:var(--text);font-weight:700;min-width:70px;text-align:right;}
```

(The bar fill uses `var(--dim)` — a neutral grey in both themes. Length, not colour, conveys impact.)

- [ ] **Step 2: Rewrite the scenario render.** Replace the `CMP_MODELS` block and its `.map` (lines ~1408–1421) with:

```js
  // Scenario comparison — always Claude Haiku / Sonnet / Opus. Neutral bars; length
  // conveys impact. The user's current tier is marked with a "you" tag + highlight.
  const CMP_MODELS = [
    { id:'haiku',  lbl:'Claude Haiku'  },
    { id:'sonnet', lbl:'Claude Sonnet' },
    { id:'opus',   lbl:'Claude Opus'   },
  ];
  const cmpRows = CMP_MODELS.map(s => {
    const rc = computeCarbon(p, s.id, p.tokens);
    return { ...s, kg: rc.totalKg, perTok: rc.perTok_g, trees: rc.totalKg / TREE_KG_YR };
  });
  const cmpMax = Math.max(...cmpRows.map(c => c.kg)) || 1;
  document.getElementById('cmpGrid').innerHTML = cmpRows.map(c => {
    const you = c.id === p.modelId;
    const pct = Math.max(2, (c.kg / cmpMax) * 100);
    const title = `${c.perTok.toExponential(2)} g/tok · ${fmt(c.trees,1)} trees/yr`;
    return `<div class="cmp-row ${you ? 'you' : ''}" title="${title}">
      <span class="cmp-name">${c.lbl}${you ? '<span class="cmp-you">you</span>' : ''}</span>
      <div class="cmp-track"><div class="cmp-bar" style="width:${pct}%"></div></div>
      <span class="cmp-val">${fmt(c.kg,3)} kg</span>
    </div>`;
  }).join('');
```

- [ ] **Step 3: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 4: Manual check.** On the calculator, the scenario section shows three rows (Haiku/Sonnet/Opus) with neutral grey bars whose lengths grow Haiku→Opus; your selected model's row has a subtle highlight + a blue "you" tag; hovering a row shows the g/tok · trees/yr tooltip. Changing the model dropdown moves the "you" tag.

- [ ] **Step 5: Commit.**

```bash
git add index.html
git commit -m "Make scenario comparison neutral with magnitude bars and a 'you' tag"
```

---

## Task 5: Semantic colours — editable values move amber → blue

**Files:** Modify `index.html` (CSS lines ~309, ~316, ~322).

- [ ] **Step 1: Editable value text.** Change `.ival` (line ~309) colour from `var(--amber)` to `var(--blue)`:

```css
.ival{font-family:var(--mono);font-size:13px;color:var(--blue);}
```

- [ ] **Step 2: Slider thumb.** In the `input[type=range]::-webkit-slider-thumb` rule (line ~316) change `background:var(--amber)` to `background:var(--blue)`. If there is a matching `::-moz-range-thumb` rule, change it too.

- [ ] **Step 3: Number/select focus border.** Change `input[type=number]:focus,select:focus{border-color:var(--amber);}` (line ~322) to `border-color:var(--blue);`.

- [ ] **Step 4: Syntax check.** awk+`node --check`. Expected: no output (CSS-only change; check still passes).

- [ ] **Step 5: Manual check.** On the calculator, slider value labels (e.g. `75%`, grid `g/kWh`) are now blue; slider thumbs are blue; focusing a number input/select shows a blue border. Amber now appears only on medium-impact signalling.

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "Recolour editable values/sliders to blue (interactive), freeing amber"
```

---

## Task 6: Less "griddy" tables — softer dividers

**Files:** Modify `index.html` (CSS for `.atbl` ~387–390 and `.loc-tbl` ~413).

- [ ] **Step 1: Soften the assumptions table.** In the `.atbl th` rule (line ~387) the bottom rule should be the stronger header divider; in `.atbl td` (line ~390) change the row divider to the new low-contrast token. Set:
  - `.atbl th { ... border-bottom:1px solid var(--border); ... }` (header rule = `--border`, the slightly stronger line).
  - `.atbl td { ... border-bottom:1px solid var(--divider); ... }` (row rules = faint `--divider`).

- [ ] **Step 2: Soften the location table.** In `.loc-tbl td` (line ~413) change `border-bottom:1px solid var(--border);` to `border-bottom:1px solid var(--divider);`.

- [ ] **Step 3: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 4: Manual check.** Open the assumptions table and the grid-preset location table: row separators are now faint (barely-there) rather than prominent boxes, in both light and dark themes; the assumptions header keeps a slightly stronger underline. Interactive controls (survey option buttons, token presets) are unchanged and still clearly bordered.

- [ ] **Step 5: Commit.**

```bash
git add index.html
git commit -m "Soften data-table dividers with a low-contrast --divider token"
```

---

## Task 7: Token question layout — presets first, custom below

**Files:** Modify `index.html` (the `s.type === 'tokens'` branch of `renderStep()`, ~922–950; token CSS ~227–240).

- [ ] **Step 1: Rebuild the tokens branch markup.** Replace the entire `else if (s.type === 'tokens') { ... }` block (lines ~922–950) with the version below — "Quick estimate" subtitle, a 4-column preset grid (ascending order), then an "or enter your own" divider and the custom input at the bottom:

```js
  else if (s.type === 'tokens') {
    const saved = answers.tokens || '';
    const tokInputId = 'tokInput';
    html += `<div class="tok-wrap">
      <div class="tok-sub" aria-hidden="true">Quick estimate</div>
      <div class="tok-presets" role="group" aria-label="Quick token estimates">
        ${[['500K','occasional use',500000],['5M','regular use',5000000],
           ['10M','heavy use',10000000],['50M','very heavy use',50000000],
           ['100M','constant use',100000000],['500M','automation / pipeline',500000000],
           ['1B','power user / team',1000000000]]
          .map(([l,sub,v])=>`<button type="button"
              class="tok-preset ${saved==v?'sel':''}"
              data-val="${v}"
              aria-pressed="${saved==v?'true':'false'}"
              aria-label="Use ${l} tokens per month — ${sub}"
              onclick="setTokenPreset(${v},this)">
              ${l}<br><span class="tok-preset-sub">${sub}</span></button>`).join('')}
      </div>
      <div class="tok-divider" aria-hidden="true">or enter your own</div>
      <label for="${tokInputId}" class="tok-custom-lbl">Exact amount</label>
      <div class="tok-input-row">
        <input type="number" id="${tokInputId}" value="${saved}" min="0" step="100000"
               placeholder="e.g. 2800000"
               aria-describedby="${hintId} tokFallback"
               oninput="answers.tokens=+this.value;syncTokenPresets();validateStep();">
        <span class="tok-unit" aria-hidden="true">tokens / month</span>
      </div>
      <div class="tok-fallback" id="tokFallback">Have dashboard access? Enter the exact number above.</div>
    </div>`;
  }
```

- [ ] **Step 2: Add/adjust the supporting CSS.** Add these rules near the existing `.tok-*` rules (~227–240). Make the presets a grid:

```css
.tok-sub{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--green);
  font-weight:600;margin-bottom:10px;}
.tok-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px;}
.tok-divider{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:11px;margin:18px 0 12px;}
.tok-divider::before,.tok-divider::after{content:"";flex:1;height:1px;background:var(--divider);}
.tok-custom-lbl{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;
  color:var(--muted);margin-bottom:8px;}
```

If the existing `.tok-presets` rule sets `display:flex`/`flex-wrap`, remove those (the grid rule above supersedes it). Keep `.tok-preset`, `.tok-preset-sub`, `.tok-input-row`, `.tok-unit`, `.tok-fallback` as-is.

- [ ] **Step 3: Confirm `setTokenPreset`/`syncTokenPresets` still match.** These functions select by `.tok-preset[data-val]` and toggle `aria-pressed`/`.sel` — unchanged by this markup. No JS change expected; verify by reading them (~1019–1031).

- [ ] **Step 4: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 5: Manual check.** Start the survey, reach the token question: "Quick estimate" subtitle appears first; seven presets sit in a 4-column grid; clicking one highlights it and enables Next; below an "or enter your own" divider, the custom number field sits at the bottom and still works (typing updates/deselects presets). Arrow/tab focus order is presets → input.

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "Reorder token question: Quick-estimate grid first, custom input below"
```

---

## Task 8: Model-selection note

**Files:** Modify `index.html` (calc model dropdowns ~541–558).

- [ ] **Step 1: Add a helper note** inside the Claude model group, right after its `<label>Claude model</label>` (line ~542). Use the muted hint style already used elsewhere:

```html
        <div class="hint" style="margin-bottom:6px">Pick the model you use most — we'll base the estimate on that one.</div>
```

- [ ] **Step 2: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 3: Manual check.** On the calculator, the note appears beneath the "Claude model" label in both themes, muted and readable.

- [ ] **Step 4: Commit.**

```bash
git add index.html
git commit -m "Add model-selection note: choose the mainly-used model"
```

---

## Task 9: Remove the inference screen; reasons become tooltips

**Files:** Modify `index.html` (intro step copy ~447; `#inferScreen` markup ~497–514; `wizNext` ~1042–1049; `showInference` ~1158–1196; `showCalc` ~1198–1229; `retakeSurvey` ~1231–1237; calc control labels for tooltip anchors).

- [ ] **Step 1: Add tooltip anchors to the calc control labels.** For each inferred parameter, add an info span beside its label. Add a small CSS rule first (near other small styles):

```css
.info-tip{display:none;margin-left:6px;color:var(--blue);cursor:help;font-size:12px;}
.info-tip.on{display:inline;}
```

Then add `<span class="info-tip" id="tip-X" tabindex="0" role="img"></span>` after the relevant labels in `#calcScreen`:
  - after `<label>Claude model</label>` → `id="tip-model"`
  - the output-% label (the one with `#outPctLbl`) → `id="tip-out"`
  - the grid label → `id="tip-grid"`
  - the PUE label → `id="tip-pue"`
  - the utilisation label → `id="tip-util"`
  - the GPU label → `id="tip-gpu"`

Example (model): `<label>Claude model <span class="info-tip" id="tip-model" tabindex="0" role="img"></span></label>`

- [ ] **Step 2: Add a tooltip helper + a tag-stripper.** In `<script>`, near the other helpers, add:

```js
function stripTags(html){ const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }
function setTip(id, html){
  const el = document.getElementById(id);
  if (!el) return;
  if (!html){ el.classList.remove('on'); el.removeAttribute('title'); el.removeAttribute('aria-label'); el.textContent=''; return; }
  const text = stripTags(html);
  el.textContent = 'ℹ️';
  el.title = text;
  el.setAttribute('aria-label', 'How this was inferred: ' + text);
  el.classList.add('on');
}
function clearTips(){ ['tip-model','tip-out','tip-grid','tip-pue','tip-util','tip-gpu'].forEach(id => setTip(id, '')); }
```

- [ ] **Step 3: Route the survey straight to the calculator.** In `wizNext` (lines ~1042–1049), replace the `else { showInference(); }` branch so the final step builds inference and shows the calculator directly:

```js
function wizNext() {
  if (currentStep < STEPS.length - 1) {
    currentStep++;
    renderStep(currentStep);
  } else {
    inferred = buildInference();
    showCalc();
  }
}
```

- [ ] **Step 4: Make `showCalc` attach reason tooltips and stop referencing the deleted screen.** Replace `showCalc` (lines ~1198–1229) with:

```js
function showCalc() {
  // push inferred values into calculator controls
  document.getElementById('wizard').style.display = 'none';
  document.getElementById('intro').style.display = 'none';
  document.getElementById('calcScreen').style.display = 'block';
  document.querySelectorAll('.surveyed').forEach(s => s.textContent = 'from survey');

  document.getElementById('tokens').value   = inferred.tokens;
  document.getElementById('outPct').value   = inferred.outPct;
  document.getElementById('outPctLbl').textContent = inferred.outPct + '%';
  document.getElementById('splitIn').style.width = (100 - inferred.outPct) + '%';
  document.getElementById('grid').value     = inferred.grid;
  document.getElementById('gridLbl').textContent = inferred.grid + ' g CO₂/kWh';
  document.getElementById('pue').value      = inferred.pue;
  document.getElementById('pueLbl').textContent  = inferred.pue.toFixed(2);
  document.getElementById('util').value     = inferred.util;
  document.getElementById('utilLbl').textContent = inferred.util + '%';

  // tool + model
  document.getElementById('tool').value = inferred.tool;
  if (inferred.tool === 'claude' && ['haiku','sonnet','opus','mix'].includes(inferred.model)) {
    document.getElementById('claudeModel').value = inferred.model;
  } else if (inferred.tool === 'fuelix') {
    document.getElementById('fuelixModel').value = inferred.model;
  }

  // gpu
  document.getElementById('gpu').value = inferred.gpu;

  // reasons → tooltips on the matching controls
  setTip('tip-model', inferred.reasons.model);
  setTip('tip-out',   inferred.reasons.outPct);
  setTip('tip-grid',  inferred.reasons.grid);
  setTip('tip-pue',   inferred.reasons.pue);
  setTip('tip-util',  inferred.reasons.util);
  setTip('tip-gpu',   inferred.reasons.gpu);

  onToolChange();          // reveal the right model sub-dropdown (also recalcs)
  updateGridHighlight();
  recalc();
  collectBaseline(false);  // survey path — see Task 11
}
```

- [ ] **Step 5: Delete `showInference`.** Remove the entire `function showInference() { ... }` (lines ~1158–1196). It is now unused.

- [ ] **Step 6: Fix `retakeSurvey`** (lines ~1231–1237) — drop the `inferScreen` reference and clear tooltips:

```js
function retakeSurvey() {
  currentStep = 0;
  document.getElementById('calcScreen').style.display = 'none';
  document.getElementById('wizard').style.display     = 'flex';
  clearTips();
  renderStep(0);
}
```

- [ ] **Step 7: Delete the `#inferScreen` markup.** Remove the whole `<main id="inferScreen" ...> ... </main>` block (lines ~497–514, includes the `inferTitle`, `inferGrid`, and the "Calculate my impact →" button). Optionally remove the now-dead `#inferScreen` CSS rule (~259–280) and `.infer-*` rules — safe to leave, but cleaner to delete.

- [ ] **Step 8: Update intro step 2 copy** (line ~447) so it no longer promises a separate inference screen:

```html
    <li><span class="intro-step-n" aria-hidden="true">2</span><span>We infer the technical parameters — model, hardware, grid, efficiency — and you can fine-tune them on the results page.</span></li>
```

- [ ] **Step 9: Grep for stragglers.** Run `grep -n "inferScreen\|showInference\|infGrid\|infOut\|infPue\|infUtil" index.html`. Expected: no remaining references (the `inf*` slider ids lived only in the deleted screen).

- [ ] **Step 10: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 11: Manual check.** Complete the survey: the final "See results →" jumps **straight to the calculator** (no intermediate screen). Each inferred control shows an ℹ️ whose hover/focus tooltip explains the inference (e.g. PUE, grid, model). "Retake survey" returns to question 1 and clears the ℹ️ tips. The "See average results →" path shows **no** ℹ️ tips (set in Task 11).

- [ ] **Step 12: Commit.**

```bash
git add index.html
git commit -m "Remove inference screen; surface reasons as tooltips on calc controls"
```

---

## Task 10: Consent UI on the intro screen

**Files:** Modify `index.html` (intro markup ~455–460; `.consent` CSS; consent JS).

- [ ] **Step 1: Add the consent control** to `#intro`, just before the closing `</div>` of `.wiz-shell` (after the `.intro-default` block, line ~460):

```html
  <label class="consent" for="consentChk">
    <input type="checkbox" id="consentChk" checked>
    <span>📊 Share my anonymous responses to help improve this tool. Uncheck to keep yours private.</span>
  </label>
```

- [ ] **Step 2: Add `.consent` CSS** (tokens only):

```css
.consent{display:flex;gap:8px;align-items:flex-start;margin-top:22px;
  font-size:12px;color:var(--muted);line-height:1.5;cursor:pointer;}
.consent input{margin-top:2px;accent-color:var(--green);}
```

- [ ] **Step 3: Add consent JS** near the theme code at the top of `<script>`:

```js
// ── Collection consent: opt-out, remembered in localStorage ──
function hasConsent(){ const c = document.getElementById('consentChk'); return c ? c.checked : false; }
(function initConsent(){
  let v = null; try { v = localStorage.getItem('collectConsent'); } catch(e) {}
  const chk = document.getElementById('consentChk');
  if (!chk) return;
  chk.checked = (v === null) ? true : (v === '1');
  chk.addEventListener('change', () => { try { localStorage.setItem('collectConsent', chk.checked ? '1' : '0'); } catch(e) {} });
})();
```

- [ ] **Step 4: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 5: Manual check.** Intro shows the consent checkbox (checked by default). Toggling it and reloading preserves the state. `hasConsent()` in the console returns the checkbox state.

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "Add intro-screen collection consent (opt-out, persisted)"
```

---

## Task 11: Client collection module

**Files:** Modify `index.html` (new block at the end of `<script>`, ~before line 1638; one call already added in `showCalc`; one to add in `runDefaults`).

- [ ] **Step 1: Add the collection module** at the end of the `<script>` block (just before `</script>`, line ~1638):

```js
// ═══════════════════════════════════════════════════════════
// SURVEY DATA COLLECTION  (fire-and-forget → Google Apps Script)
// Paste your deployed Web App URL below to enable. Empty = no-op.
// ═══════════════════════════════════════════════════════════
const COLLECT_URL = '';   // e.g. 'https://script.google.com/macros/s/AKfy.../exec'

const _collect = { sessionId:null, payload:null, sent:false, explored:false, editCount:0 };

function _newId(){
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch(e) {}
  return 'sid-' + Date.now() + '-' + Math.floor(Math.random()*1e9);
}

function sendCollect(payload){
  if (!COLLECT_URL) return;
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, new Blob([body], { type:'text/plain' }));
    } else {
      fetch(COLLECT_URL, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain' }, body });
    }
  } catch(e) { /* best-effort: never disturb the UI */ }
}

// Snapshot the honest "usage" baseline at first results render.
function collectBaseline(quickRun){
  if (_collect.sent || !COLLECT_URL || !hasConsent()) return;
  const p = getCalcInputs();
  const r = computeCarbon(p, p.modelId, p.tokens);
  _collect.sessionId = _newId();
  _collect.payload = {
    sessionId:    _collect.sessionId,
    quickRun:     !!quickRun,
    ai_tool:      quickRun ? null : (answers.ai_tool ?? null),
    hardware:     quickRun ? null : (answers.hardware ?? null),
    output_ratio: quickRun ? null : (answers.output_ratio ?? null),
    task_type:    quickRun ? null : (answers.task_type ?? null),
    interactive:  quickRun ? null : (answers.interactive ?? null),
    frequency:    quickRun ? null : (answers.frequency ?? null),
    tokens:       p.tokens,
    model:        p.modelId,
    gpu:          document.getElementById('gpu').value,
    util:         Math.round(p.util * 100),
    pue:          p.pue,
    grid:         p.grid,
    carbonKg:     r.totalKg,
    explored:     false,
    editCount:    0,
    clientTime:   new Date().toISOString(),
  };
  _collect.sent = true;
  sendCollect(_collect.payload);

  // Attach exploration listeners once. These fire only on real user input
  // (programmatic value-setting above does not dispatch input/change events).
  const calc = document.getElementById('calcScreen');
  if (calc && !calc._exploreHooked) {
    calc._exploreHooked = true;
    calc.addEventListener('input',  markExplored);
    calc.addEventListener('change', markExplored);
  }
}

let _exploreTimer = null;
function markExplored(){
  if (!_collect.sent || !COLLECT_URL || !hasConsent()) return;
  _collect.explored = true;
  _collect.editCount++;
  _collect.payload.explored = true;
  _collect.payload.editCount = _collect.editCount;
  clearTimeout(_exploreTimer);
  _exploreTimer = setTimeout(() => sendCollect(_collect.payload), 2000);
}
window.addEventListener('pagehide', () => { if (_collect.explored) sendCollect(_collect.payload); });
```

- [ ] **Step 2: Fire the baseline on the quick-run path.** In `runDefaults` (ends ~1272), after `recalc();` add:

```js
  clearTips();              // average-user run has no survey reasons
  collectBaseline(true);
```

(The `collectBaseline(false)` call on the survey path was already added in Task 9 / `showCalc`.)

- [ ] **Step 3: Syntax check.** awk+`node --check`. Expected: no output.

- [ ] **Step 4: Manual check (no-op path).** With `COLLECT_URL` empty, run both flows — nothing breaks, no network calls (DevTools Network is quiet), no console errors. In the console after reaching results, `_collect.payload` is built and correct (right `quickRun`, survey fields, baseline params). Drag a slider → `_collect.explored` becomes `true` and `editCount` increments.

- [ ] **Step 5: Manual check (live path, optional but recommended).** Temporarily set `COLLECT_URL` to a throwaway inspector (e.g. a https://webhook.site URL). Reach results → exactly one POST with the baseline JSON. Tweak sliders, wait ~2s → one update POST with `explored:true`. Untick consent on intro, rerun → zero POSTs. Restore `COLLECT_URL = ''` before committing (real URL is added in Task 12 deployment, not committed unless you choose to).

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "Add client survey-collection module (baseline + exploration, consent-gated)"
```

---

## Task 12: Apps Script + README documentation

**Files:** Modify `README.md`. (Apps Script `Code.gs` is pasted at script.google.com by the owner — its source is documented here.)

- [ ] **Step 1: Add a "Data collection" section to `README.md`** documenting what is gathered and the privacy posture (anonymous, per-visit session id only, opt-out on intro, one row per visitor, exploration not stored as values). Use the payload table from the design spec.

- [ ] **Step 2: Document the Apps Script.** Add the deployment steps and this script source under the new section:

```js
// Code.gs — paste into Extensions → Apps Script, then Deploy → Web app.
const SHEET_NAME = 'responses';
const SECRET = '';   // optional: set a shared secret and send it in the client payload

function doPost(e){
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (SECRET && data.secret !== SECRET) return ContentService.createTextOutput('forbidden');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const headers = ['sessionId','serverTime','clientTime','quickRun','ai_tool','hardware',
      'output_ratio','task_type','interactive','frequency','tokens','model','gpu','util',
      'pue','grid','carbonKg','explored','editCount'];
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    const row = headers.map(h => {
      if (h === 'serverTime') return new Date();
      const v = data[h];
      return Array.isArray(v) ? v.join('|') : (v === undefined || v === null ? '' : v);
    });
    const n = Math.max(sheet.getLastRow() - 1, 0);
    const ids = n ? sheet.getRange(2, 1, n, 1).getValues().flat() : [];
    const idx = ids.indexOf(data.sessionId);
    if (idx >= 0) sheet.getRange(idx + 2, 1, 1, headers.length).setValues([row]);  // upsert
    else sheet.appendRow(row);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}
```

Deployment steps to document:
1. Create a Google Sheet → Extensions → Apps Script; paste `Code.gs`.
2. Deploy → New deployment → type **Web app**; "Execute as: Me"; "Who has access: Anyone".
3. Copy the **Web app URL** into `COLLECT_URL` in `index.html`.
4. (Optional) set a `SECRET` here and add `secret:'…'` to the client payload to deter junk POSTs.

- [ ] **Step 3: Note the trade-offs** in the README: free tier (quota-limited, not billed); public endpoint; `no-cors`/`sendBeacon` fire-and-forget means no delivery confirmation in the browser.

- [ ] **Step 4: Verify the script (owner, manual).** After deploying and pasting the URL, complete a run; confirm a row appears in the `responses` tab with a server timestamp; rerun the *same* session (don't reload) after a tweak and confirm the row is **updated**, not duplicated (upsert by `sessionId`).

- [ ] **Step 5: Commit.**

```bash
git add README.md
git commit -m "Document data collection + Apps Script setup and trade-offs"
```

---

## Self-review (completed against the spec)

**Spec coverage:**
- §1 collection: client module (Task 11), consent (Task 10), Apps Script + README (Task 12), baseline-at-first-render + upsert + explored/editCount (Tasks 11/12), quickRun column (Task 11). ✓
- §2.1 light/dark: Tasks 1–2. ✓
- §2.2 semantic colours / neutral tiers: Tasks 3–5 (headline impact colour, neutral scenario bars + "you", editable→blue, equivalents neutral, confidence bars already green/amber/red — no change needed). ✓
- §2.3 less griddy: Task 6. ✓
- §2.4 token layout: Task 7. ✓
- §2.5 model note: Task 8. ✓
- §2.6 remove inference screen + reasons→tooltips: Task 9. ✓
- Cross-cutting: consent/theme kept out of `SHARE_KEYS` (local prefs, not added); `escapeHtml` usage in `STEPS` untouched; accessibility preserved (ARIA on presets/tooltips, aria-label on impact headline). ✓

**Placeholder scan:** none — every step has concrete code/commands. `COLLECT_URL` intentionally empty (documented no-op), `IMPACT_THRESHOLDS` concrete.

**Type/name consistency:** `collectBaseline`, `sendCollect`, `markExplored`, `hasConsent`, `setTip`, `clearTips`, `stripTags`, `applyTheme`, `toggleTheme`, `impactColor`, `impactLabel`, `_collect.payload` used consistently across Tasks 3/9/10/11. `showCalc` calls `collectBaseline(false)`; `runDefaults` calls `collectBaseline(true)`. Tooltip ids (`tip-model/out/grid/pue/util/gpu`) match between markup (Task 9 Step 1) and `setTip`/`clearTips` calls.
