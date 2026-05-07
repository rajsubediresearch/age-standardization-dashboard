# Age Standardization Dashboard

An interactive browser-based tool for **direct** and **indirect age standardization**. No installation, no server, no dependencies.

**[→ Open the dashboard](https://rajsubediresearch.github.io/age-standardization-dashboard/)**

---

## Usage

**Online** — open the live version directly in your browser:
[https://rajsubediresearch.github.io/age-standardization-dashboard/](https://rajsubediresearch.github.io/age-standardization-dashboard/)

**Locally** — download or clone this repo and open `index.html` in any modern browser. Or serve it:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

---

## Methods

**Direct standardization** — applies study population age-specific rates to a standard population to produce a single standardized rate.

**Indirect standardization** — applies standard population rates to the study population's age distribution to compute expected events; outputs SMR = Observed / Expected with a Byar 95% CI.

Both methods support editable age groups, custom rate labels (ASMR, CMR, incidence rate, etc.), and results downloadable as CSV, TXT, or HTML.

---

## Files

```
index.html   main page
style.css    styling
app.js       calculation logic
```

---

## License

MIT
