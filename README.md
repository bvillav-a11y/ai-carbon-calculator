# 🌿 AI Carbon Impact Calculator

A browser-based tool that estimates the monthly carbon footprint of your personal AI usage — no installation, no backend, no data sent anywhere.

**[→ Public demo](https://bvillav-a11y.github.io/ai-carbon-calculator)** (GitHub Pages) · **[→ TELUS internal](https://ai-carbon-footprint.telus.gizmos.run)** (Gizmos, SSO required)

---

## What it does

Most AI carbon footprint tools either require technical knowledge to operate or hide their assumptions entirely. This calculator takes a different approach:

1. **A short survey** calibrates parameters to your actual usage pattern — no need to know what a PUE or GPU utilisation rate is
2. **An inference summary** shows exactly what was derived from your answers and lets you override any value
3. **A full calculator** displays a live equation trace, confidence bars, and a cited assumptions table so you can see — and challenge — every number

Outputs include total kg CO₂, car-equivalent km driven, trees needed to offset, and carbon cost in USD at $50/tonne.

A **Share results** button on the calculator screen copies a URL that encodes the full calculator state into the hash (`#s=...`). Opening that URL on another machine lands directly on the calculator with the same numbers loaded — no backend, no tracking, just `location.hash`.

The interface is built to **WCAG 2.1 AA**: semantic radio groups for the survey, full keyboard navigation (Tab + arrow keys), ARIA live regions on the wizard progress and results, and focus rings on every interactive control.

---

## Why this exists

AI inference has a real but largely invisible environmental cost. The energy consumed per token varies by:

- which model you're running (a 70B model uses ~7× more energy per token than a 7B model)
- where the servers are (the same query on a coal grid emits up to 50× more CO₂ than on a hydro grid)
- how efficiently the hardware is utilised
- how much of your usage is output vs input tokens (output costs ~5× more per token)

This tool makes those factors visible and personal.

---

## How to use it

Clone the repo and open `index.html` directly — no server, no build step, no internet required (the Google Font degrades gracefully offline).

```bash
git clone https://github.com/bvillav-a11y/ai-carbon-calculator
cd ai-carbon-calculator
open index.html        # macOS; or double-click on Windows/Linux
```

---

## Deployment

### GitHub Pages — public demo

Serves `main` at **https://bvillav-a11y.github.io/ai-carbon-calculator** (~1 min after push). No build step — Pages serves `index.html` directly. Collection is attempted the same as on Gizmos, but the `/collect` path 404s here, so POSTs silently no-op.

```bash
git push   # deploys automatically when main is updated
```

### Gizmos — TELUS internal

The real home at **https://ai-carbon-footprint.telus.gizmos.run** (TELUS SSO). A plain Workers module (no imports) serves `index.html` from a base64-inlined string and exposes two same-origin routes backed by the app's per-app D1 database:

- **`POST /collect`** — upserts anonymous survey data by session id. Same-origin avoids cross-origin/cookie issues. Path must **not** start with `/api/` (reserved by the Gizmos platform).
- **`GET /export`** — dumps the `responses` table as CSV. Gated by TELUS SSO.

Edit worker logic in `scripts/worker.template.ts`. After any change to `index.html` or the template, regenerate the bundle:

```bash
node scripts/embed.mjs                        # compile → gizmos-app/src/index.ts
gizmos push --dry-run --org telus gizmos-app  # preview
gizmos push --org telus gizmos-app            # deploy (needs GIZMOS_API_KEY)
```

D1 is auto-provisioned; the `responses` table is created lazily. Inspect data at `/export` in an SSO'd browser. (`gizmos db` needs an OIDC session, not the push key; `gizmos logs ai-carbon-footprint --org telus` works with either.)

---

## Methodology

The core calculation follows this chain:

```
tokens → raw energy (kWh) → utilisation-adjusted energy
       → PUE-adjusted energy → operational carbon (kg CO₂)
       + embodied hardware carbon = total carbon
```

### Energy per token

Model-specific energy figures are derived from published literature:

- **Claude models (Haiku / Sonnet / Opus):** Simon P. Couch (2026) — *Electricity use of AI coding agents* ([blog post](https://simonpcouch.com/blog/2026-01-20-cc-impact/)) — napkin-math estimates extrapolated from Epoch AI's ChatGPT 4o analysis and applied to Sonnet 4.5 / Opus 4.5. Maximum-context scenario: input ~390 Wh/MTok, output ~1950 Wh/MTok. Couch explicitly notes Opus is likely larger but more efficiently served, so he treats them as the same ballpark. We scale Haiku and Opus from Sonnet, which is itself approximate.
- **Other LLMs / internal tools:** Niu et al. (2025), *TokenPowerBench: Benchmarking the Power Consumption of LLM Inference* (arxiv:2512.03024) — measures per-token energy across Llama, Falcon, Qwen, and Mistral model families on H100 hardware, from 1B up to Llama-3 405B.
- **Output vs input cost ratio:** The ~5× output-to-input energy ratio reflects the well-known asymmetry between parallel prefill (input) and sequential autoregressive decoding (output). The specific ratio used here is consistent with Luccioni et al. (2023), *Power Hungry Processing: Watts Driving the Cost of AI Deployment?* (arxiv:2311.16863) and with systems-paper measurements (e.g. Splitwise, DistServe).

### Hardware

GPU TDP and throughput figures from:
- Spheron Network — *AI Inference Power Consumption and GPU Electricity Costs: 2026 Guide*
- OpenMetal — *Comparing NVIDIA H100 vs A100 GPUs for AI Workloads*
- NVIDIA official spec sheets

### Grid carbon intensity

- Brazil: Operador Nacional do Sistema Elétrico (ONS) 2024 national average (~136 g CO₂/kWh, hydro-dominant)
- Other regions: [Electricity Maps](https://www.electricitymaps.com/) regional averages

### Data centre overhead (PUE)

Uptime Institute *Global Data Center Survey 2023* — industry norms by infrastructure type (hyperscaler ≈ 1.2, typical cloud ≈ 1.4, on-premise ≥ 1.5).

### Embodied carbon

Dell / Nvidia product carbon footprint lifecycle assessment estimates. H100 ≈ 150–300 kg CO₂ to manufacture; amortised over lifetime token output.

### Equivalencies

| Metric | Value | Source |
|---|---|---|
| Car emissions | 170 g CO₂/km | Approximate global passenger-car fleet average. (EEA reports ~106 g/km for *new* EU cars in 2023, but the existing global fleet — what most people picture when they think "car" — runs higher, closer to 170 g/km.) |
| Tree absorption | 22 kg CO₂/year | Commonly cited mid-range figure; varies 11–50 kg/yr by species, age, and biome. Frequently attributed to US EPA / USDA Forest Service rather than IPCC. |
| Carbon price | $50/tonne | Order-of-magnitude reference roughly in line with mid-2020s ETS prices and social-cost-of-carbon estimates. The World Bank *State and Trends of Carbon Pricing 2024* dashboard tracks the actual range (often $30–$90/t). |

---

## Limitations & honest caveats

This tool produces **order-of-magnitude estimates**, not audited measurements. Key sources of uncertainty:

**High uncertainty (red bars in the tool):**
- Model energy per token — Anthropic and most providers do not publish per-token energy figures. All values are derived from third-party measurements and may not reflect current infrastructure.
- PUE — not disclosed by cloud providers at the per-service level.
- Embodied hardware carbon — lifecycle data for AI GPUs is sparse and inconsistently reported.

**Medium uncertainty:**
- GPU utilisation — estimated from usage pattern; actual shared-cloud utilisation varies.
- Grid carbon intensity — national averages; real-time marginal intensity would be more accurate.

**Low uncertainty:**
- Token count — directly measured from your dashboard.
- Hardware specs (TDP, throughput) — from manufacturer datasheets.
- Equivalency conversions — well-established reference values.

The confidence bars in the tool reflect these levels explicitly. Treat results as directionally correct, not precisely audited.

---

## Data collection

The app sends **one anonymous record per completed run** to understand how people use AI and improve the tool. Collection is **opt-out**: a checkbox on the intro screen (ticked by default) controls it, and the choice is remembered in your browser.

### GitHub Pages

The browser POSTs to `/collect` the same as on Gizmos, but there is no backend, so the request 404s and silently no-ops. No data is stored.

### Gizmos

Submissions land in the app's per-app D1 database via a same-origin `POST /collect`. Same-origin avoids the cross-origin/cookie problem that killed an earlier Google Apps Script attempt. **The path must not begin with `/api/`** — Gizmos reserves that prefix and blocks app POSTs to it.

**What is collected** (one row per visit, upserted by a random per-visit session id):

| Field | Meaning |
|---|---|
| `session_id` | Random per-visit id (dedup only — not identity, not stored elsewhere) |
| `server_time` / `client_time` | When the record was received / created |
| `quick_run` | `1` if the "See average results" demo was used instead of the survey |
| `ai_tool`, `hardware`, `output_ratio`, `task_type`, `interactive`, `frequency` | The raw survey answers (null on a quick-run) |
| `tokens`, `model`, `gpu`, `util`, `pue`, `grid` | The inferred/baseline parameters |
| `carbon_kg` | Resulting monthly kg CO₂ at the baseline |
| `explored`, `edit_count` | Whether (and how often) the user tweaked parameters afterward |

The record is **frozen at the moment results first render** — the honest "usage" snapshot. Tweaking sliders afterward is treated as *exploration*: it only flips `explored`/`edit_count`, never the baseline values.

**Privacy posture:** no names, emails, IP-linked identifiers, or free text are collected; only the structured fields above. The session id is random and exists solely to keep one row per visit. Because the Gizmos app is gated behind TELUS SSO, the collection endpoint never needs to authenticate the caller — and the data stays inside TELUS.

Inspect data at `/export` (CSV dump) in an SSO'd browser. (`gizmos db` needs an OIDC session, not the push key; `gizmos logs ai-carbon-footprint --org telus` works with either.)

---

## Contributing

Corrections, better energy-per-token measurements, and additional model support are all welcome. If you have access to more precise per-model inference energy data — especially for proprietary models — please open an issue or PR.

---

## Acknowledgements

Built during a brainstorm about AI sustainability at work. Methodology grounded in:

- Patterson et al. (2021) — *Carbon Emissions and Large Neural Network Training* (arxiv:2104.10350) — foundational methodology, focused on training rather than inference
- Luccioni et al. (2023) — *Power Hungry Processing: Watts Driving the Cost of AI Deployment?* (arxiv:2311.16863)
- Couch (2026) — *Electricity use of AI coding agents* ([simonpcouch.com](https://simonpcouch.com/blog/2026-01-20-cc-impact/))
- Niu et al. (2025) — *TokenPowerBench: Benchmarking the Power Consumption of LLM Inference* (arxiv:2512.03024)
- Ligozat et al. (2022) — *Unraveling the Hidden Environmental Impacts of AI Solutions*

---

## License

MIT — use it, adapt it, share it.
