# SupplyChainRisk
A supplier intelligence prototype that helps users identify supplier risk, understand delivery exposure, and explore mitigation options before deciding what to do next.

**[Run the prototype locally](#run-locally)** · **[Read the step-by-step explanation](docs/HOW_IT_WORKS.md)**

> **Current status:** This is a working browser application using fictional demo records and transparent mathematical rules. A trained machine-learning model, live shipment feeds, and a backend database are future work. The risk index is not a probability, and the prototype does not establish predictive accuracy.

## What it does

| View | What you can do |
| --- | --- |
| **Overview** | Review supplier counts, high-risk suppliers, delivery reliability, annual spend at risk, a supplier map, and priority signals. |
| **Suppliers** | Search, filter, and sort suppliers; inspect the inputs behind a risk index; manage a watchlist; import and export CSV files. |
| **Shipments** | Explore 36 fictional orders, filter by delivery status or transport mode, inspect estimated arrival dates, and export matching records. |
| **Scenario lab** | Change disruption days, planning buffer, delivery reliability, or supplier dependency and compare the resulting risk and delay estimates. |
| **Action plan** | Create mitigation tasks, save scenarios as review tasks, and mark tasks complete. |

Global search is available from the top bar or with **Cmd+K / Ctrl+K**. The **About the model** link explains the calculations inside the application.

## Run locally

You need the complete project folder, a modern browser, and a static web server. Python 3 provides one convenient option.

From a terminal opened in the project folder, run:

```bash
python3 -m http.server 8000 --directory dist
```

Then open **http://localhost:8000**. Stop the server with **Ctrl+C**. Serve the folder over HTTP rather than opening `index.html` directly: the application uses JavaScript modules.

No package installation or build step is required to run the dashboard. Keep all five files in `dist/` together; the HTML imports the JavaScript and stylesheet files.

To run the existing automated checks, use Node.js with support for its built-in test runner:

```bash
npm test
```

## Implementation and file guide

The current application uses **HTML, CSS, vanilla JavaScript, SVG, and browser local storage**. It has no runtime package dependencies and makes no supplier-data API calls.

| File | Responsibility |
| --- | --- |
| [`dist/index.html`](dist/index.html) | Page entry point, metadata, and application mount elements. |
| [`dist/app.js`](dist/app.js) | Five views, navigation, search, filters, dialogs, imports, exports, scenarios, tasks, and persistence. |
| [`dist/model.js`](dist/model.js) | Demo records, risk and delay formulas, scenario transformations, shipment generation, portfolio metrics, and CSV utilities. |
| [`dist/styles.css`](dist/styles.css) | Dashboard styling, responsive layouts, focus styles, and reduced-motion rules. |
| [`dist/icons.js`](dist/icons.js) | Reusable inline SVG icons. |
| [`tests.mjs`](tests.mjs) | Calculation, scenario, CSV, data consistency, and view-rendering checks. |
| [`package.json`](package.json) | Module configuration and the `npm test` command. |
| [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md) | Data flow, worked calculations, user walkthrough, limitations, and the path to a predictive system. |

Python, Pandas, SQL, scikit-learn, XGBoost, and Power BI belong to the intended broader project stack. They are **not used by this browser prototype**.

## How scoring works

Five supplier metrics are converted to a common 0–100 scale, multiplied by fixed weights, and added together. The total is rounded to the nearest integer.

| Factor | Input transformation | Weight |
| --- | --- | --- |
| Delivery reliability | `(100 - on_time_rate) × 1.45`, capped at 100 | 40% |
| Historical delays | `avg_delay_days × 8.5`, capped at 100 | 25% |
| Quality issues | `defect_rate × 18`, capped at 100 | 15% |
| Supplier dependency | `dependency`, already on a 0–100 scale | 12% |
| Lead-time volatility | `volatility`, already on a 0–100 scale | 8% |

| Rounded index | Risk band |
| --- | --- |
| 0–34 | Low |
| 35–64 | Medium |
| 65–100 | High |

The separate delay-exposure estimate is:

```text
delay_days = round_to_1_decimal(
    0.8 × avg_delay_days
  + 0.045 × (100 - on_time_rate)
  + 0.018 × volatility
  + 0.15 × defect_rate
)
```

Weights, multipliers, and thresholds are prototype assumptions. Country, region, and annual spend do not change an individual supplier's risk index.

**Worked demo:** Shenzhen Precision starts at **75/100, high risk**, with **14.1 days** of estimated delay exposure. The **Mitigation plan** preset adds 10 percentage points to on-time delivery, adds a 5-day planning buffer, and reduces dependency by 25 percentage points. The scenario becomes **58/100, medium risk**, with **9.7 days** of delay exposure. These are formula outputs, not measured business outcomes.

## Import your own supplier CSV

In **Suppliers → Import CSV**, download the sample template, edit it, select your CSV, and confirm the validated import.

| Required column | Meaning and accepted value |
| --- | --- |
| `id` | Nonempty supplier identifier, unique across demo records and all imports. |
| `name` | Nonempty supplier name. |
| `country` | Nonempty country label for display. |
| `region` | Exactly `Americas`, `Europe`, `Asia Pacific`, or `Middle East & Africa`. |
| `category` | Nonempty category label, such as `Electronics`. |
| `spend` | Nonnegative annual spend in USD, without a currency symbol or thousands separators. |
| `on_time_rate` | Delivery percentage from 0 to 100. Use `92` for 92%. |
| `avg_delay_days` | Nonnegative average historical delay in days. |
| `defect_rate` | Defect percentage from 0 to 100. Use `1.5` for 1.5%. |
| `dependency` | Share of category purchasing assigned to this supplier, from 0 to 100. |
| `volatility` | Assumed lead-time variability index from 0 to 100; not raw days or a standard deviation. |

Example:

```csv
id,name,country,region,category,spend,on_time_rate,avg_delay_days,defect_rate,dependency,volatility
CUSTOM-001,Example Supplier,United States,Americas,Electronics,1000000,92,2,1,30,25
```

The importer accepts up to **500 rows per import** and files up to **2 MiB**. Numeric fields cannot be empty. Duplicate IDs, invalid ranges, unsupported regions, and malformed CSV rows are rejected. Validation completes before records are added; imports append records rather than overwriting existing suppliers.

Imported suppliers receive scores and appear in directory, portfolio, and scenario calculations. They do not receive synthetic shipment history or map coordinates. Supplier export includes all records matching the current supplier filters, plus calculated scores, risk bands, estimated delay, data-source labels, and the fixed demo snapshot date.

## Demo data and persistence

The default dataset contains **12 suppliers across 11 countries**, **36 shipments**, and a fixed snapshot of **October 20, 2026**. On the original data, the overview has 3 high-risk suppliers, $5.58 million of annual spend associated with them, and 82.7% spend-weighted on-time delivery.

The delivery percentage is calculated from supplier-level historical rates, not from the status counts of the 36 demo shipments. Annual spend at risk is exposure associated with high-risk suppliers; it is not an expected loss estimate.

Watchlists, imported supplier records, tasks, and saved scenarios are stored under `supplychainrisk-v1` in the current browser's local storage. They can survive a reload in the same browser and origin, but do not synchronize across devices or between localhost and the hosted site. Clearing browser storage removes them. When storage is unavailable, changes last for the current session.

Use **Action plan → Restore original demo workspace** to reset local records. Supplier CSV exports are reports, not complete backups of tasks and scenarios.

## Verification and limitations

The seven automated checks cover risk bounds and thresholds, scenario behavior, portfolio and shipment consistency, quoted and multiline CSV fields, invalid imports, spreadsheet-formula neutralization in exports, and basic rendering of all five views. The rendering check uses a simulated DOM; it does not verify browser layout or every interaction. Visual browser QA was not completed during the initial build.

The map routes, 30-day trend values, priority signals, shipment statuses, and shipment dates are illustrative. There are no connected tracking feeds, supplier notifications, shared task assignments, model training jobs, or measured accuracy metrics. Scenario changes do not alter the original supplier record or replan shipments.

For the full explanation and a concrete plan for connecting historical data and trained models, see [How this project works](docs/HOW_IT_WORKS.md).
