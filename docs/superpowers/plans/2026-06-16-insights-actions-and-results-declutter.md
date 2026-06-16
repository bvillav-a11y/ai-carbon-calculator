# Insights & Actions + Results Declutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Insights & actions" card (personalized model right-sizing + grid insight + static checklist) and restructure the results screen outcome-first, collapsing the parameter inputs and the calculation trace behind expanders.

**Architecture:** All in `index.html`. New `renderInsights(p, r)` runs inside `recalc()` and writes to a `#insights` container. Two new collapse toggles (`toggleParams`/`toggleTrace`) clone the existing `toggleAdv` pattern (`.tog` button + `.adv`/`.adv.open` region). The `#calcScreen .wrap` markup is reordered: Results → Insights → collapsed Adjust-parameters → Scenario → collapsed Calculation-trace → Confidence + Assumptions. After any `index.html` edit, regenerate the gizmos embed (`node scripts/embed.mjs`).

**Tech Stack:** Vanilla JS, hand-written CSS, no build/test tooling.

> **VERIFICATION MODEL:** No test runner (by design). Each task verifies with `awk '/<script>/{f=1;next}/<\/script>/{f=0}f' index.html > /tmp/check.js && node --check /tmp/check.js` + a specific manual browser check + commit. Anchors give current line hints; locate by the quoted string. This branch is `feature/insights-and-declutter` (stacked on `feature/gizmos-collection`).

---

## File structure
- **Modify:** `index.html` — CSS (insights styles), JS (`renderInsights`, `toggleParams`, `toggleTrace`, constants, `recalc` call), markup (`#calcScreen .wrap` reorder + header copy).
- **Modify:** `scripts/worker.template.ts` — none (it embeds index.html unchanged). Just re-run `scripts/embed.mjs` after.
- **Modify:** `CLAUDE.md` — update the screen-pipeline description.

---

## Task 1: Insights card CSS

**Files:** Modify `index.html` (add CSS near the other result styles, e.g. after the `.disclosure` rule ~line 373).

- [ ] **Step 1: Add styles.** Insert:

```css
/* Insights & actions */
.ins-block{margin-bottom:14px;}
.ins-block:last-child{margin-bottom:0;}
.ins-h{font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;}
.ins-line{font-size:13px;line-height:1.5;color:var(--text);border-left:3px solid var(--green);
  padding-left:10px;margin-bottom:6px;}
.ins-line b{color:var(--green);}
.ins-principle{color:var(--muted);}
.ins-principle b{color:var(--text);}
.ins-list{margin:0;padding-left:18px;}
.ins-list li{font-size:12px;line-height:1.6;color:var(--muted);}
.ins-list li b{color:var(--text);}
```

- [ ] **Step 2: Syntax check.** `awk … node --check`. Expected: no output (CSS-only; check still passes).
- [ ] **Step 3: Commit.**
```bash
git add index.html && git commit -m "Add Insights card CSS"
```

---

## Task 2: renderInsights() + constants, wired into recalc()

**Files:** Modify `index.html` (JS: add helper + constants above `function recalc()` ~line 1390; add one call inside `recalc()`).

- [ ] **Step 1: Add constants + `renderInsights` above `recalc()`.** Find `function recalc() {` and insert immediately before it:

```js
// ── Insights & actions ──
const GRID_HIGH = 150;        // g CO₂/kWh above which we suggest a cleaner grid
const GRID_CLEAN_REF = 50;    // representative hydro/nuclear-class grid
const TIER_ORDER = ['haiku', 'sonnet', 'opus'];
const COMPLEXITY_LABELS = ['very simple', 'simple', 'moderate', 'complex', 'very complex'];

function pctCut(after, before){ return before > 0 ? Math.round((1 - after / before) * 100) : 0; }

function renderInsights(p, r){
  const el = document.getElementById('insights');
  if (!el) return;  // markup may not exist yet

  // Block 1 — right-size the model
  let modelLine = '';
  const taskIdx = answers.task_type;
  const isClaudeTier = TIER_ORDER.includes(p.modelId);
  if (isClaudeTier && taskIdx !== undefined) {
    const recommended = inferModel(taskIdx);
    const selIdx = TIER_ORDER.indexOf(p.modelId);
    const recIdx = TIER_ORDER.indexOf(recommended);
    const complexity = escapeHtml(COMPLEXITY_LABELS[taskIdx] || 'moderate');
    if (selIdx > recIdx) {
      const rc = computeCarbon(p, recommended, p.tokens);
      modelLine = `Your tasks look <b>${complexity}</b>, but you're on <b>${escapeHtml(MODEL_SPECS[p.modelId].label)}</b>. `
        + `<b>${escapeHtml(MODEL_SPECS[recommended].label)}</b> would likely handle them and cut `
        + `<b>~${fmt(r.totalKg - rc.totalKg, 2)} kg/mo (−${pctCut(rc.totalKg, r.totalKg)}%)</b>.`;
    } else if (selIdx === recIdx) {
      modelLine = `<b>${escapeHtml(MODEL_SPECS[p.modelId].label)}</b> fits your <b>${complexity}</b> workload — good match. `
        + `Drop to a lighter model for quick lookups.`;
    } else {
      modelLine = `Your tasks look <b>${complexity}</b>; <b>${escapeHtml(MODEL_SPECS[p.modelId].label)}</b> may underperform — `
        + `size up only if quality suffers.`;
    }
  }
  const principle = `<span class="ins-principle">Right-size: <b>Haiku</b> for quick lookups · `
    + `<b>Sonnet</b> for balanced · <b>Opus</b> for hard reasoning. Pick the smallest model that meets the need.</span>`;

  // Block 2 — cleaner electricity
  let gridLine;
  if (p.grid > GRID_HIGH) {
    const gc = computeCarbon({ ...p, grid: GRID_CLEAN_REF }, p.modelId, p.tokens);
    gridLine = `Your grid is <b>~${p.grid} g CO₂/kWh</b>. Running where the grid is cleaner `
      + `(hydro/nuclear ~${GRID_CLEAN_REF} g) would cut <b>~${pctCut(gc.totalKg, r.totalKg)}%</b>.`;
  } else {
    gridLine = `You're already on a relatively clean grid (~${p.grid} g CO₂/kWh) — nice.`;
  }

  el.innerHTML =
    `<div class="ins-block"><div class="ins-h">🎯 Right-size your model</div>`
    + (modelLine ? `<div class="ins-line">${modelLine}</div>` : ``)
    + `<div class="ins-line">${principle}</div></div>`
    + `<div class="ins-block"><div class="ins-h">🌱 Cleaner electricity</div>`
    + `<div class="ins-line">${gridLine}</div></div>`
    + `<div class="ins-block"><div class="ins-h">✅ Other ways to cut it</div>`
    + `<ul class="ins-list">`
    + `<li><b>Trim output length</b> — output tokens cost ~5× input; ask for concise answers.</li>`
    + `<li><b>Use it deliberately</b> — every token scales linearly; reuse good outputs instead of regenerating.</li>`
    + `<li><b>Prefer greener providers/regions</b> when you can choose.</li>`
    + `</ul></div>`;
}
```

- [ ] **Step 2: Call it from `recalc()`.** Find the end of `recalc()` — the assumptions-table render block that sets `document.getElementById('aBody').innerHTML = rows.map(...)`. Immediately after that statement (still inside `recalc`), add:

```js
  renderInsights(p, r);
```

- [ ] **Step 3: Syntax check.** `awk … node --check`. Expected: no output.
- [ ] **Step 4: Manual check (pre-markup).** `open index.html`, "See average results". No error in console; `renderInsights` no-ops because `#insights` doesn't exist yet (guarded). Calculator still works.
- [ ] **Step 5: Commit.**
```bash
git add index.html && git commit -m "Add renderInsights() with model + grid insights, called from recalc()"
```

---

## Task 3: Collapse toggles for parameters and trace

**Files:** Modify `index.html` (JS: add two functions next to `toggleAdv` ~line 1535).

- [ ] **Step 1: Add `toggleParams` + `toggleTrace`** right after `function toggleAdv() { … }`:

```js
function toggleParams() {
  const s = document.getElementById('paramsSec');
  const btn = document.getElementById('paramsTog');
  const open = !s.classList.contains('open');
  s.classList.toggle('open', open);
  btn.textContent = open ? '⚙ Hide parameters' : '⚙ Adjust parameters';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleTrace() {
  const s = document.getElementById('traceSec');
  const btn = document.getElementById('traceTog');
  const open = !s.classList.contains('open');
  s.classList.toggle('open', open);
  btn.textContent = open ? '▾ Hide calculation trace' : '▸ Show calculation trace';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
```

- [ ] **Step 2: Syntax check.** `awk … node --check`. Expected: no output.
- [ ] **Step 3: Commit.**
```bash
git add index.html && git commit -m "Add toggleParams/toggleTrace collapse helpers"
```

---

## Task 4: Restructure `#calcScreen .wrap` (outcome-first + collapses)

**Files:** Modify `index.html` (replace the entire `<div class="wrap"> … </div><!-- /wrap -->` block, currently ~lines 529–753).

This relocates existing blocks; no inner control markup changes (so all `oninput`/ids/ARIA stay intact). New order: Results (trace removed) → Insights → Adjust-parameters (collapsed, wraps the 3 input cards) → Scenario → Calculation-trace (collapsed) → Confidence + Assumptions.

- [ ] **Step 1: Replace the whole `.wrap` block.** Replace everything from `<div class="wrap">` through `</div><!-- /wrap -->` with:

```html
<div class="wrap">

  <!-- RESULTS (outcome-first) -->
  <div class="card full">
    <div class="clabel">Results — this month</div>

    <div class="rgrid" id="resultsLive" aria-live="polite" aria-atomic="true">
      <div class="rcell"><div class="rnum" id="r-co2" aria-label="Total kilograms of CO2">—</div><div class="runit">kg CO₂</div><div class="rlbl">total</div></div>
      <div class="rcell"><div class="rnum c-km" id="r-km" aria-label="Equivalent kilometers driven by car">—</div><div class="runit">km driven</div><div class="rlbl">car equiv.</div></div>
      <div class="rcell"><div class="rnum c-trees" id="r-trees" aria-label="Trees per year to offset">—</div><div class="runit">trees/yr</div><div class="rlbl">to offset</div></div>
      <div class="rcell"><div class="rnum c-cost" id="r-cost" aria-label="Cost in US dollars at $50 per tonne carbon">—</div><div class="runit">USD</div><div class="rlbl">@ $50/t CO₂</div></div>
    </div>

    <div class="pertok-row">
      <span style="font-size:13px;color:var(--muted)">g CO₂ per token</span>
      <span class="rnum" id="r-pertok" style="font-size:17px" aria-label="Grams of CO2 per token">—</span>
    </div>

    <div class="disclosure" role="note">
      <span class="disclosure-icon" aria-hidden="true">⚠️</span>
      <span><b>This is probably an underestimate.</b> It counts operational inference energy plus amortised GPU manufacturing only. Because providers don't disclose full life-cycle data for LLMs or their infrastructure — model training, networking, cooling water, and the embodied carbon of non-GPU hardware are all excluded — your real footprint is likely higher.</span>
    </div>

    <div class="igroup" style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-share" id="btnShare" onclick="shareResults()" type="button"
              aria-label="Copy a shareable link to these results">🔗 Share results</button>
      <span class="share-toast" id="shareToast" role="status" aria-live="polite"></span>
    </div>
  </div>

  <!-- INSIGHTS & ACTIONS -->
  <div class="card full">
    <div class="clabel">Insights &amp; actions</div>
    <div id="insights" aria-live="polite"></div>
  </div>

  <!-- ADJUST PARAMETERS (collapsed by default) -->
  <div class="full">
    <button class="tog" onclick="toggleParams()" type="button"
            aria-expanded="false" aria-controls="paramsSec" id="paramsTog">⚙ Adjust parameters</button>
    <div class="adv" id="paramsSec" role="region" aria-labelledby="paramsTog">

      <div class="card" style="margin-top:10px">
        <div class="clabel">Model &amp; usage</div>
        <div class="igroup">
          <label>AI tool</label>
          <select id="tool" onchange="onToolSelect()">
            <option value="claude" selected>Claude (Anthropic)</option>
            <option value="fuelix">FuelIX (TELUS)</option>
            <option value="gpt">GPT (OpenAI)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
        </div>
        <div class="igroup" id="claudeModelWrap">
          <label>Claude model <span class="info-tip" id="tip-model" tabindex="0" role="img"></span></label>
          <div class="hint" style="margin-bottom:6px">Pick the model you use most — we'll base the estimate on that one.</div>
          <select id="claudeModel" onchange="recalc()">
            <option value="haiku">Haiku — fast / light tasks</option>
            <option value="sonnet" selected>Sonnet — balanced</option>
            <option value="opus">Opus — complex reasoning</option>
          </select>
        </div>
        <div class="igroup" id="fuelixModelWrap" style="display:none">
          <label>Model size estimate</label>
          <select id="fuelixModel" onchange="recalc()">
            <option value="fuelix_small">Small (~7B)</option>
            <option value="fuelix_medium" selected>Medium (~13–35B)</option>
            <option value="fuelix_large">Large (~70B+)</option>
          </select>
        </div>
        <div class="igroup">
          <label>Monthly tokens</label>
          <div class="irow">
            <label>Output token fraction <span class="surveyed">from survey</span> <span class="info-tip" id="tip-out" tabindex="0" role="img"></span></label>
            <span class="ival" id="outPctLbl">75%</span>
          </div>
          <input type="range" id="outPct" min="5" max="95" value="75"
                 aria-label="Output token fraction, percent"
                 aria-valuetext="75 percent"
                 oninput="document.getElementById('outPctLbl').textContent=this.value+'%';
                          document.getElementById('splitIn').style.width=(100-this.value)+'%';
                          this.setAttribute('aria-valuetext', this.value+' percent');
                          recalc();">
          <div class="split"><div class="split-in" id="splitIn" style="width:25%"></div><div class="split-out"></div></div>
          <div class="split-legend" aria-hidden="true">
            <span><span class="dot" style="background:var(--blue)"></span>Input — cheaper, parallel</span>
            <span><span class="dot" style="background:var(--purple)"></span>Output — ~5× costlier</span>
          </div>
        </div>
        <div class="igroup">
          <label for="tokens">Total tokens / month</label>
          <input type="number" id="tokens" value="5000000" min="0" step="100000" onchange="recalc()">
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="clabel">Hardware</div>
        <div class="igroup">
          <label>GPU type <span class="surveyed">from survey</span> <span class="info-tip" id="tip-gpu" tabindex="0" role="img"></span></label>
          <select id="gpu" onchange="recalc()">
            <option value="h100">NVIDIA H100 SXM5 (700W) — frontier cloud</option>
            <option value="a100" selected>NVIDIA A100 SXM4 (400W) — common cloud</option>
            <option value="a100pcie">NVIDIA A100 PCIe (300W)</option>
            <option value="unknown">Unknown / mixed (A100 proxy)</option>
          </select>
        </div>
        <div class="igroup">
          <div class="irow">
            <label>Hardware utilisation <span class="surveyed">from survey</span> <span class="info-tip" id="tip-util" tabindex="0" role="img"></span></label>
            <span class="ival" id="utilLbl">60%</span>
          </div>
          <input type="range" id="util" min="10" max="100" value="60"
                 aria-label="Hardware utilisation, percent"
                 aria-valuetext="60 percent"
                 oninput="document.getElementById('utilLbl').textContent=this.value+'%';
                          this.setAttribute('aria-valuetext', this.value+' percent');
                          recalc();">
          <div class="hint">Low = energy wasted idling. Interactive use → lower than batch pipelines.</div>
        </div>
        <div class="igroup">
          <div class="irow">
            <label>PUE — data centre overhead <span class="surveyed">from survey</span> <span class="info-tip" id="tip-pue" tabindex="0" role="img"></span></label>
            <span class="ival" id="pueLbl">1.40</span>
          </div>
          <input type="range" id="pue" min="1.0" max="2.5" step="0.05" value="1.4"
                 aria-label="Power Usage Effectiveness"
                 aria-valuetext="1.40"
                 oninput="document.getElementById('pueLbl').textContent=parseFloat(this.value).toFixed(2);
                          this.setAttribute('aria-valuetext', parseFloat(this.value).toFixed(2));
                          recalc();">
          <div class="hint">1.2 = hyperscaler. 1.4 = typical cloud. 2.0+ = on-prem.</div>
        </div>
        <button class="tog" onclick="toggleAdv()" type="button"
                aria-expanded="false" aria-controls="advSec" id="togBtn">⚙ Show embodied carbon settings</button>
        <div class="adv" id="advSec" role="region" aria-labelledby="togBtn">
          <div class="subdiv">Embodied carbon</div>
          <div class="igroup">
            <div class="irow"><label>GPU manufacturing CO₂ (kg)</label><span class="ival" id="gpuCo2Lbl">200 kg</span></div>
            <input type="range" id="gpuCo2" min="50" max="500" step="10" value="200"
                   aria-label="GPU manufacturing CO2 in kilograms"
                   oninput="document.getElementById('gpuCo2Lbl').textContent=this.value+' kg';
                            this.setAttribute('aria-valuetext', this.value+' kilograms');
                            recalc();">
          </div>
          <div class="igroup">
            <div class="irow"><label>GPU lifetime (years)</label><span class="ival" id="gpuLifeLbl">4 yrs</span></div>
            <input type="range" id="gpuLife" min="1" max="8" value="4"
                   aria-label="GPU lifetime in years"
                   oninput="document.getElementById('gpuLifeLbl').textContent=this.value+' yrs';
                            this.setAttribute('aria-valuetext', this.value+' years');
                            recalc();">
          </div>
          <div class="igroup">
            <div class="irow"><label>Tokens per GPU / month (M)</label><span class="ival" id="gpuTokLbl">50M</span></div>
            <input type="range" id="gpuTok" min="1" max="500" step="5" value="50"
                   aria-label="Tokens per GPU per month, in millions"
                   oninput="document.getElementById('gpuTokLbl').textContent=this.value+'M';
                            this.setAttribute('aria-valuetext', this.value+' million tokens');
                            recalc();">
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="clabel">Electricity grid <span class="surveyed">from survey</span></div>
        <div class="igroup">
          <div class="irow">
            <label>Grid carbon intensity <span class="info-tip" id="tip-grid" tabindex="0" role="img"></span></label>
            <span class="ival" id="gridLbl">136 g CO₂/kWh</span>
          </div>
          <input type="range" id="grid" min="15" max="800" step="5" value="136"
                 aria-label="Grid carbon intensity in grams of CO2 per kilowatt hour"
                 aria-valuetext="136 grams per kilowatt hour"
                 oninput="document.getElementById('gridLbl').textContent=this.value+' g CO₂/kWh';
                          this.setAttribute('aria-valuetext', this.value+' grams per kilowatt hour');
                          updateGridHighlight();recalc();">
          <div class="hint" style="margin-bottom:8px">Drag the slider or choose a region. The grid defaults to where your selected AI tool runs.</div>
          <div class="hint" style="margin-bottom:6px">Claude, GPT and Gemini run predominantly in US data centres (~400 g CO₂/kWh); FuelIX runs on Canadian infrastructure (~120). Adjust by region below if you know where yours runs.</div>
          <div class="grid-or" aria-hidden="true">— or pick a region —</div>
          <table class="loc-tbl" id="locTbl" role="listbox" aria-label="Quick grid presets">
            <tbody>
            <tr data-g="136" class="active-loc" role="option" tabindex="0" aria-selected="true"><td>🇧🇷 Brazil (hydro-heavy)</td><td>136 g/kWh</td></tr>
            <tr data-g="120" role="option" tabindex="0" aria-selected="false"><td>🇨🇦 Canada national avg</td><td>120 g/kWh</td></tr>
            <tr data-g="15"  role="option" tabindex="0" aria-selected="false"><td>🇨🇦 Canada BC (hydro)</td><td>15 g/kWh</td></tr>
            <tr data-g="400" role="option" tabindex="0" aria-selected="false"><td>🇺🇸 US average</td><td>400 g/kWh</td></tr>
            <tr data-g="60"  role="option" tabindex="0" aria-selected="false"><td>🇫🇷 France (nuclear)</td><td>60 g/kWh</td></tr>
            <tr data-g="700" role="option" tabindex="0" aria-selected="false"><td>🇵🇱 Poland (coal)</td><td>700 g/kWh</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>

  <!-- SCENARIO COMPARISON -->
  <div class="card full">
    <div class="clabel">Scenario comparison — same token volume, different models</div>
    <div class="cmp-grid" id="cmpGrid">…</div>
    <div class="hint" style="margin-top:8px">Recalculated live using your current hardware and grid settings.</div>
  </div>

  <!-- CALCULATION TRACE (collapsed by default) -->
  <div class="full">
    <button class="tog" onclick="toggleTrace()" type="button"
            aria-expanded="false" aria-controls="traceSec" id="traceTog">▸ Show calculation trace</button>
    <div class="adv" id="traceSec" role="region" aria-labelledby="traceTog">
      <div class="eqbox" id="eqbox" aria-live="polite">…</div>
    </div>
  </div>

  <!-- CONFIDENCE + ASSUMPTIONS -->
  <div class="card">
    <div class="clabel">Estimate confidence</div>
    <div id="confBars"></div>
  </div>

  <div class="card">
    <div class="clabel">Assumptions &amp; sources</div>
    <table class="atbl">
      <thead><tr><th>Factor</th><th>Value</th><th>Contribution</th><th>Source</th><th>Unc.</th></tr></thead>
      <tbody id="aBody"></tbody>
    </table>
  </div>

</div><!-- /wrap -->
```

- [ ] **Step 2: Verify no duplicate/lost ids.** Run:
```bash
for id in tool claudeModel fuelixModel tokens outPct splitIn util pue gpu gpuCo2 gpuLife gpuTok grid locTbl r-co2 r-pertok eqbox cmpGrid confBars aBody insights paramsSec traceSec; do
  n=$(grep -c "id=\"$id\"" index.html); [ "$n" = "1" ] || echo "ID $id appears $n times (expected 1)"; done; echo "id check done"
```
Expected: only `id check done` (every id exactly once).

- [ ] **Step 3: Syntax check.** `awk … node --check`. Expected: no output.
- [ ] **Step 4: Manual check.** `open index.html` → "See average results": Results card + Insights card show at top; "⚙ Adjust parameters" and "▸ Show calculation trace" start collapsed; expanding Adjust parameters reveals the 3 input cards and editing a slider updates results live; expanding trace shows the ledger; the model & grid insights show real numbers; toggling theme still works. Also walk the survey path and confirm the model insight reflects the task-complexity answer.
- [ ] **Step 5: Commit.**
```bash
git add index.html && git commit -m "Restructure results screen: outcome-first, collapse params + trace, add Insights card"
```

---

## Task 5: Header copy + regenerate gizmos embed

**Files:** Modify `index.html` (header line ~525); run `scripts/embed.mjs`.

- [ ] **Step 1: Update the header sub-line.** Replace:
```html
  <p>Results calibrated from your survey. All inferred parameters are editable below.</p>
```
with:
```html
  <p>Results calibrated from your survey. Expand “⚙ Adjust parameters” below to fine-tune any value.</p>
```

- [ ] **Step 2: Regenerate the gizmos embed.** Run:
```bash
node scripts/embed.mjs
```
Expected: `Wrote gizmos-app/src/index.ts — inlined … base64 chars …`.

- [ ] **Step 3: Verify embed round-trips + worker still parses.**
```bash
node -e 'const fs=require("fs");const s=fs.readFileSync("gizmos-app/src/index.ts","utf8");const m="const INDEX_HTML_B64 = ";const i=s.indexOf(m)+m.length;const j=s.indexOf(";\n",i);console.log("byte-identical:",Buffer.from(JSON.parse(s.slice(i,j)),"base64").equals(fs.readFileSync("index.html")))'
cp gizmos-app/src/index.ts /tmp/w.mjs && node --check /tmp/w.mjs && echo "worker OK"
```
Expected: `byte-identical: true` and `worker OK`.

- [ ] **Step 4: Commit.**
```bash
git add index.html gizmos-app/src/index.ts && git commit -m "Update header copy; regenerate gizmos embed"
```

---

## Task 6: Update CLAUDE.md screen-pipeline description

**Files:** Modify `CLAUDE.md` (the "Architecture — the screen pipeline" section).

- [ ] **Step 1: Update the `#calcScreen` bullet** to describe the new order. Find the line beginning `3. **`#calcScreen`** — the calculator;` and replace its sentence with:

```markdown
3. **`#calcScreen`** — the calculator, outcome-first: **Results → Insights & actions (`renderInsights()` → `#insights`) → collapsed "⚙ Adjust parameters" (`toggleParams`/`#paramsSec`, the editable inputs) → Scenario comparison → collapsed "Calculation trace" (`toggleTrace`/`#traceSec`) → Confidence + Assumptions.** `recalc()` reads the DOM inputs and renders every result block including `renderInsights()`. The old `#inferScreen` was removed; `buildInference()`'s `reasons.*` are ℹ️ tooltips via `setTip()`.
```

- [ ] **Step 2: Add an Insights note** under the "data flow" bullets (after the `recalc()` bullet):

```markdown
- `renderInsights(p, r)` (called last in `recalc()`) writes the **Insights & actions** card: a personalized model right-size line (compares the selected Claude tier vs the task-complexity-recommended tier from `inferModel`, with real savings via `computeCarbon`), a grid insight (savings vs a `GRID_CLEAN_REF` clean grid when `p.grid > GRID_HIGH`), the always-on right-size principle, and a static checklist. Quick-run / non-Claude → principle-only fallback.
```

- [ ] **Step 3: Commit.**
```bash
git add CLAUDE.md && git commit -m "Document insights card + outcome-first results pipeline"
```

---

## Task 7: Engagement telemetry — worker schema + migration

**Files:** Modify `scripts/worker.template.ts` (`COLS`, `ensureTable`, `collect`). Do **not** hand-edit `gizmos-app/src/index.ts` (it's generated).

- [ ] **Step 1: Extend `COLS`.** Replace the `COLS` array with (six fields appended, order matters — params below must match):

```js
const COLS = [
  "session_id", "server_time", "client_time", "quick_run", "ai_tool",
  "hardware", "output_ratio", "task_type", "interactive", "frequency",
  "tokens", "model", "gpu", "util", "pue", "grid", "carbon_kg",
  "explored", "edit_count",
  "dwell_ms", "opened_params", "opened_trace", "opened_advanced",
  "clicked_share", "retook_survey",
];
```

- [ ] **Step 2: Update `ensureTable` — full schema + one-time ALTER migration.** Replace the whole `ensureTable` function with:

```js
let _schemaReady = false;
async function ensureTable(db) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS responses (" +
    "session_id TEXT PRIMARY KEY, server_time TEXT NOT NULL, client_time TEXT, " +
    "quick_run INTEGER, ai_tool TEXT, hardware INTEGER, output_ratio INTEGER, " +
    "task_type INTEGER, interactive INTEGER, frequency INTEGER, tokens INTEGER, " +
    "model TEXT, gpu TEXT, util INTEGER, pue REAL, grid INTEGER, carbon_kg REAL, " +
    "explored INTEGER, edit_count INTEGER, dwell_ms INTEGER, opened_params INTEGER, " +
    "opened_trace INTEGER, opened_advanced INTEGER, clicked_share INTEGER, retook_survey INTEGER)"
  );
  // The prod table predates the telemetry columns; CREATE IF NOT EXISTS won't add
  // them, so best-effort ALTER each (SQLite throws on an existing column — ignore).
  // Once per worker instance.
  if (_schemaReady) return;
  const adds = ["dwell_ms INTEGER", "opened_params INTEGER", "opened_trace INTEGER",
    "opened_advanced INTEGER", "clicked_share INTEGER", "retook_survey INTEGER"];
  for (let i = 0; i < adds.length; i++) {
    try { await db.exec("ALTER TABLE responses ADD COLUMN " + adds[i]); } catch (e) { /* exists */ }
  }
  _schemaReady = true;
}
```

- [ ] **Step 3: Extend the insert params in `collect`.** In `collect(req, env)`, replace the `params` array with (six values appended, matching `COLS` order):

```js
  const params = [
    sid, new Date().toISOString(), d.clientTime ?? null, d.quickRun ? 1 : 0, aiTool,
    d.hardware ?? null, d.output_ratio ?? null, d.task_type ?? null, d.interactive ?? null,
    d.frequency ?? null, d.tokens ?? null, d.model ?? null, d.gpu ?? null, d.util ?? null,
    d.pue ?? null, d.grid ?? null, d.carbonKg ?? null, d.explored ? 1 : 0, d.editCount ?? 0,
    d.dwellMs ?? null, d.openedParams ? 1 : 0, d.openedTrace ? 1 : 0, d.openedAdvanced ? 1 : 0,
    d.clickedShare ? 1 : 0, d.retookSurvey ? 1 : 0,
  ];
```

- [ ] **Step 4: Syntax check the worker.** `node scripts/embed.mjs >/dev/null && cp gizmos-app/src/index.ts /tmp/w.mjs && node --check /tmp/w.mjs && echo OK`. Expected: `OK`.
- [ ] **Step 5: Commit.**
```bash
git add scripts/worker.template.ts gizmos-app/src/index.ts && git commit -m "Telemetry: add engagement columns + ALTER migration to worker"
```

---

## Task 8: Engagement telemetry — client instrumentation

**Files:** Modify `index.html` (collection module ~`collectBaseline`/`markExplored`/`pagehide`, plus `toggleParams`/`toggleTrace`/`toggleAdv`, `shareResults`, `retakeSurvey`).

- [ ] **Step 1: Init telemetry fields + startTs in `collectBaseline`.** In the `_collect.payload = { … }` object literal, add these keys (after `editCount: 0,`):

```js
    dwellMs:        null,
    openedParams:   false,
    openedTrace:    false,
    openedAdvanced: false,
    clickedShare:   false,
    retookSurvey:   false,
```

And immediately after `_collect.sent = true;` (before `sendCollect(...)`), add:

```js
  _collect.startTs = Date.now();
```

- [ ] **Step 2: Add `markEngagement` + an always-fire finaliser; replace the `pagehide` line.** Find the `markExplored` function and the `window.addEventListener('pagehide', …)` line. Leave `markExplored` as-is; **replace** the single `pagehide` listener line with:

```js
function markEngagement(key){
  if (!_collect.sent || !COLLECT_URL || !hasConsent() || !_collect.payload) return;
  _collect.payload[key] = true;
  clearTimeout(_exploreTimer);
  _exploreTimer = setTimeout(function(){ sendCollect(_collect.payload); }, 2000);
}
function _finalizeCollect(){
  if (!_collect.sent || !COLLECT_URL || !hasConsent() || !_collect.payload) return;
  _collect.payload.dwellMs = Date.now() - (_collect.startTs || Date.now());
  sendCollect(_collect.payload);
}
window.addEventListener('pagehide', _finalizeCollect);
window.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') _finalizeCollect(); });
```

- [ ] **Step 3: Instrument the expanders.** In `toggleParams`, `toggleTrace`, and `toggleAdv`, add inside the `open` branch (only when opening). Each already computes `const open = !s.classList.contains('open');`. After `btn.setAttribute('aria-expanded', …)` add:
  - `toggleParams`: `if (open) markEngagement('openedParams');`
  - `toggleTrace`: `if (open) markEngagement('openedTrace');`
  - `toggleAdv`: `if (open) markEngagement('openedAdvanced');`

- [ ] **Step 4: Instrument share + retake.** In `shareResults()` add at the top of the function body: `markEngagement('clickedShare');`. In `retakeSurvey()` add at the top: `markEngagement('retookSurvey');` (before navigating away — `markEngagement` schedules a debounced send and the value also rides the `pagehide` finaliser).

- [ ] **Step 5: Syntax check.** `awk … node --check`. Expected: no output.
- [ ] **Step 6: Manual check.** `open index.html`, "See average results". In console, after expanding params/trace and clicking share, `_collect.payload` shows `openedParams/openedTrace/clickedShare = true`. (`dwellMs` is set only on tab-hide.) No errors.
- [ ] **Step 7: Commit.**
```bash
git add index.html && git commit -m "Telemetry: client dwell timer + expansion/share/retake flags"
```

---

## Task 9: Re-embed, redeploy to Gizmos, verify telemetry end-to-end

**Files:** regenerate `gizmos-app/src/index.ts`; deploy.

- [ ] **Step 1: Regenerate embed + syntax.**
```bash
node scripts/embed.mjs && cp gizmos-app/src/index.ts /tmp/w.mjs && node --check /tmp/w.mjs && echo OK
```
Expected: embed message + `OK`.

- [ ] **Step 2: Deploy.**
```bash
GIZMOS_API_KEY=gzm_… gizmos push --org telus --app ai-carbon-footprint gizmos-app
```
Expected: `Deployed! Live at: https://ai-carbon-footprint.telus.gizmos.run`. (Use a fresh key if rotated.)

- [ ] **Step 3: Verify on the live app (SSO browser).** Open the app → "See average results" → expand "Adjust parameters" and "Calculation trace", click "Share results" → wait a moment, then **leave/close the tab** (fires the dwell finaliser) → reopen and visit `/export`. The row should show `opened_params=1`, `opened_trace=1`, `clicked_share=1`, and a non-empty `dwell_ms`.
- [ ] **Step 4: Confirm via logs if needed.** `gizmos logs ai-carbon-footprint --org telus --since 10m | grep collect` → `collect ok …`.
- [ ] **Step 5: Commit any embed delta** (if not already committed in Task 8's chain):
```bash
git add gizmos-app/src/index.ts && git commit -m "Regenerate embed with telemetry" || echo "nothing to commit"
```

---

## Self-review (against the spec)

**Spec coverage:**
- A. Insights card — Task 1 (CSS), Task 2 (render: model b/c + grid + checklist), placement after Results — Task 4. ✓
- Model right-size (b survey / c fallback, Claude-only personalization, under-provision honesty) — Task 2 `renderInsights`. ✓
- Grid personalization (GRID_HIGH 150 / GRID_CLEAN_REF 50) — Task 2. ✓
- B. Outcome-first reorder, collapse params + trace — Task 4 (markup), Task 3 (toggles). ✓
- Collapsed-by-default (no `.open` initially), aria-expanded/controls — Task 4 markup + Task 3. ✓
- Live updates (renderInsights in recalc) — Task 2. ✓
- Header copy — Task 5. ✓
- gizmos embed regen — Task 5. ✓
- Docs — Task 6. ✓
- C. Telemetry — 6 columns + ALTER migration (Task 7), client dwell + flags + always-fire finaliser (Task 8), redeploy + live verify (Task 9). ✓
- Dwell = results-page (startTs at baseline → finaliser) — Task 8. ✓
- opened_params/trace/advanced wired into the expand branch — Task 8 Step 3. ✓
- clicked_share / retook_survey — Task 8 Step 4. ✓
- Schema migration for the existing prod table (ALTER, once per instance) — Task 7 Step 2. ✓

**Placeholder scan:** none — all steps have complete code/commands. The `…` inside `#cmpGrid`/`#eqbox` are the existing placeholder glyphs the render functions overwrite (not plan gaps).

**Type/name consistency:** ids/functions consistent across tasks — `#insights` (Task 4 markup ↔ Task 2 `renderInsights`), `paramsSec`/`paramsTog`/`toggleParams` and `traceSec`/`traceTog`/`toggleTrace` (Task 3 ↔ Task 4), `GRID_HIGH`/`GRID_CLEAN_REF`/`TIER_ORDER`/`COMPLEXITY_LABELS`/`pctCut`/`renderInsights` defined once (Task 2). `onToolSelect`/`recalc`/`computeCarbon`/`inferModel`/`MODEL_SPECS`/`fmt`/`escapeHtml`/`answers` are pre-existing. Markup reuses existing control ids verbatim (no renames) so all `oninput` handlers keep working.
