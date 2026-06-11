# Age Standardization Dashboard

An interactive browser-based tool for **direct** and **indirect age standardization**, designed for teaching and learning. No installation, no server, no dependencies — runs entirely in your browser.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20068581.svg)](https://doi.org/10.5281/zenodo.20068581)

**[→ Open the dashboard](https://rajsubediresearch.github.io/age-standardization-dashboard/)**

---

## What it does

Age standardization removes the confounding effect of age when comparing rates across populations with different age structures. This tool implements both standard methods with a focus on transparency — every computation is shown step by step alongside the results.

**Direct standardization** answers: *"If the study population had the same age structure as the standard population, what would its overall rate be?"* It applies the study population's age-specific rates to the standard population's age distribution.

**Indirect standardization** answers: *"How many events would we expect in the study population if it experienced the same age-specific rates as the standard population?"* It computes the SMR (Standardized Mortality/Morbidity Ratio) = Observed ÷ Expected, with Byar's 95% confidence interval.

---

## Features

### Teaching-focused design
- **Step-by-step computation** — every result panel shows the formula, each symbol defined, and your actual data substituted in
- **Color-coded populations** — blue throughout for the standard population, amber for the study population, applied consistently to input fields, column headers, metric cards, and formula substitutions
- **Plain-language interpretation** — results are explained in words, not just numbers

### Flexible age group management
- **Preset schemes** — WHO abridged (default), WHO 5-year bands, US Census broad, Working-age focused, or Custom
- **Hide/show rows** — exclude an age group from computation without deleting it (eye icon per row); useful for exploring the effect of collapsing age groups
- **Add rows** — append blank rows for custom schemes
- **Reset age groups** — restore labels from the active preset while keeping your rates
- **Reset all** — restore everything to sample data
- **Undo** — one-level undo for any destructive action

### Outputs
- Key metrics displayed as labeled cards
- Full age-group table with population-tagged column headers
- Downloadable results as **CSV**, **TXT report**, or **HTML report** — all include population tags (`[standard]` / `[study pop]`) in column names

---

## Usage

**Online** — open the live version directly in your browser:
[https://rajsubediresearch.github.io/age-standardization-dashboard/](https://rajsubediresearch.github.io/age-standardization-dashboard/)

**Locally** — download or clone this repo and open `index.html` in any modern browser. Or serve it with Python:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

---

## Files

```
index.html   main page and UI structure
style.css    styling and color system
app.js       calculation logic, rendering, and preset definitions
README.md    this file
```

---

## Cite

If you use this tool in teaching or research, please cite:

> Subedi, R. (2025). *Age Standardization Dashboard* (v1.0.0). Zenodo. https://doi.org/10.5281/zenodo.20068581

---

## License

MIT
