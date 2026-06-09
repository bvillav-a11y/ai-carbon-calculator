# 🌿 AI Carbon Impact Calculator

A browser-based tool that estimates the monthly carbon footprint of your personal AI usage — no installation, no backend, no data sent anywhere.

**[→ Try it live](https://bvillav-a11y.github.io/ai-carbon-calculator)** 

---

## What it does

Most AI carbon footprint tools either require technical knowledge to operate or hide their assumptions entirely. This calculator takes a different approach:

1. **A short survey** calibrates parameters to your actual usage pattern — no need to know what a PUE or GPU utilisation rate is
2. **An inference summary** shows exactly what was derived from your answers and lets you override any value
3. **A full calculator** displays a live equation trace, confidence bars, and a cited assumptions table so you can see — and challenge — every number

Outputs include total kg CO₂, car-equivalent km driven, trees needed to offset, and carbon cost in USD at $50/tonne.

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

Download or clone this repo, open `index.html` in any modern browser, and follow the 8-question wizard. No dependencies, no build step, no internet connection required (except for loading the Google Font, which degrades gracefully).

```bash
git clone https://github.com/yourname/ai-carbon-calculator
cd ai-carbon-calculator
open index.html        # macOS
# or just double-click index.html on Windows/Linux
```

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

- **Claude models (Haiku / Sonnet / Opus):** Simon P. Couch (2026) — *Electricity use of AI coding agents* — the closest published measurement of per-token energy for Claude specifically, derived from Claude Code session logs. Input: ~390 Wh/MTok, Output: ~1950 Wh/MTok for Sonnet. Haiku and Opus scaled proportionally.
- **Other LLMs / internal tools:** Cañas et al. (2024), *TokenPowerBench* (arxiv:2512.03024) — cross-model GPU benchmarks measuring actual energy per token across LLaMA, Mistral, and Qwen model families on H100 hardware.
- **Output vs input cost ratio:** Luccioni et al. (2023), *Power Hungry Processing* (arxiv:2211.02001) — output tokens are generated sequentially (autoregressive decoding) vs input tokens processed in parallel (prefill), making output ~5× more energy-intensive per token.

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
| Car emissions | 170 g CO₂/km | European Environment Agency 2023 |
| Tree absorption | 22 kg CO₂/year | IPCC AR6 WG3 |
| Carbon price | $50/tonne | World Bank Carbon Pricing Dashboard 2024 |

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

## Contributing

Corrections, better energy-per-token measurements, and additional model support are all welcome. If you have access to more precise per-model inference energy data — especially for proprietary models — please open an issue or PR.

---

## Acknowledgements

Built during a brainstorm about AI sustainability at work. Methodology grounded in:

- Patterson et al. (2021) — *Carbon Considerations for Large Language Models* (arxiv:2104.10350)
- Luccioni et al. (2023) — *Power Hungry Processing* (arxiv:2211.02001)
- Couch (2026) — *Electricity use of AI coding agents*
- Cañas et al. (2024) — *TokenPowerBench* (arxiv:2512.03024)
- Ligozat et al. (2022) — *Unraveling the Hidden Environmental Impacts of AI Solutions*

---

## License

MIT — use it, adapt it, share it.
