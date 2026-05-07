# Age Standardization Dashboard

An interactive, browser-based teaching tool for **direct** and **indirect age standardization** — no server, no dependencies, no installation required.

![screenshot placeholder](screenshot.png)

---

## Features

- Toggle between **Direct** and **Indirect (SMR)** methods
- Pre-loaded sample data (9 age groups, typical mortality rates)
- Fully editable: rename age groups, change all values, add or remove rows
- Instant computation with formula display and plain-English interpretation
- For indirect method: SMR with Byar's approximate 95% confidence interval
- Download results as **CSV**, **TXT report**, or **HTML report**
- Runs entirely in the browser — no data leaves the user's machine

---

## Files

```
age-standardization-dashboard/
├── index.html   ← main page (structure)
├── style.css    ← all styling
├── app.js       ← all calculation and interactivity logic
└── README.md    ← this file
```

---

## How to run locally

No build step needed. Just open the folder and:

**Option A — double-click**
Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari).

**Option B — local server (recommended, avoids browser file-access quirks)**
```bash
# Python 3
cd age-standardization-dashboard
python -m http.server 8000
# then open http://localhost:8000
```

---

## Deploy on GitHub Pages (step-by-step)

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** button (top-right) → **New repository**.
3. Name it: `age-standardization-dashboard` (or anything you like).
4. Set it to **Public** (required for free GitHub Pages).
5. Leave everything else at defaults → click **Create repository**.

### Step 2 — Upload the files

**If you're comfortable with Git (command line):**
```bash
git clone https://github.com/rajsubediresearch/age-standardization-dashboard.git
cd age-standardization-dashboard
# copy index.html, style.css, app.js, README.md into this folder
git add .
git commit -m "Initial commit: age standardization dashboard"
git push origin main
```

**If you prefer the GitHub website (no Git needed):**
1. On your new repository page, click **Add file → Upload files**.
2. Drag and drop all four files (`index.html`, `style.css`, `app.js`, `README.md`).
3. Scroll down, write a commit message like `add dashboard files`, and click **Commit changes**.

### Step 3 — Enable GitHub Pages

1. In your repository, click the **Settings** tab (top menu).
2. In the left sidebar, click **Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/ (root)`.
5. Click **Save**.
6. Wait about 60–90 seconds, then refresh the page.
7. A green banner will appear with your live URL:
```
https://rajsubediresearch.github.io/age-standardization-dashboard/
```

Share that URL with your students — it works on any device, no installation needed.

---

## How to update the default data

Open `app.js` and find the `DEFAULTS` object near the top:

```js
const DEFAULTS = {
  direct: {
    stdPop:    [8000, 10000, 12000, 11000, 10000, 8500, 7000, 5000, 2500],
    studyRate: [2.1,  0.5,   1.2,   1.8,   4.1,   9.3,  22.0, 48.5, 95.0],
  },
  indirect: {
    stdRate:   [2.0,  0.4,   1.0,   1.5,   3.8,   8.5,  20.0, 45.0, 90.0],
    stdPop:    [8000, 10000, 12000, 11000, 10000, 8500,  7000,  5000, 2500],
    studyPop:  [1200, 1800,  2200,  2000,  1900,  1600,  1300,  900,  400],
    studyObs:  280,
  },
};
```

Edit the numbers, save, and push. You can also change `DEFAULT_AGE_GROUPS` just above it.

---

## Methods reference

### Direct standardization

Applies age-specific rates from the **study population** to a **standard population**:

```
Standardized rate = Σ (wᵢ × rᵢ)

wᵢ = standard pop in age group i / total standard pop
rᵢ = age-specific rate in study population (per 1,000)
```

Use when: you have age-specific rates for your study population and want a single summary rate that removes the confounding effect of age.

### Indirect standardization (SMR)

Applies **standard population rates** to the study population's age distribution:

```
Expected events = Σ (standard rate in group i × study pop in group i / 1,000)
SMR             = Observed events / Expected events
```

Use when: your study population is small (age-specific rates are unstable) but you know the total observed events.

**SMR interpretation:**
- SMR = 1.0 → same risk as standard population
- SMR > 1.0 → higher risk
- SMR < 1.0 → lower risk

The dashboard reports an approximate 95% confidence interval using **Byar's method**.

---

## License

MIT — free for teaching, research, and adaptation.
