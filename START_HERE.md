# Open SupplyChainRisk in VS Code

This download contains the full editable browser prototype, its README, the detailed project explanation, and the automated checks.

## 1. Open the project

1. Extract `SupplyChainRisk_VSCode.zip`.
2. Open VS Code.
3. Choose **File → Open Folder** and select the extracted **SupplyChainRisk** folder. Select the folder that contains `README.md`, `package.json`, and `dist`.
4. Open **Terminal → New Terminal**. The terminal should be in the project folder.

## 2. Start the local website

Make sure Python 3 is available, then run this in the VS Code terminal:

```bash
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000** in your browser. Keep the terminal running while you use the app. Press **Ctrl+C** in the terminal to stop it.

You can also use **Terminal → Run Task → Run SupplyChainRisk** in VS Code. This runs the same Python command from the project folder.

No package installation or build step is required. Serve the folder over HTTP instead of double-clicking `dist/index.html`, because the application uses JavaScript modules.

If port 8000 is occupied, use `python3 -m http.server 8001 --directory dist` and open `http://localhost:8001` instead.

## 3. Edit the code

| What you want to change | File |
| --- | --- |
| Dashboard views, navigation, filters, and interactions | `dist/app.js` |
| Demo suppliers, scoring formulas, and scenario logic | `dist/model.js` |
| Layout, colors, fonts, and responsive styles | `dist/styles.css` |
| Page metadata and HTML entry point | `dist/index.html` |
| Icons | `dist/icons.js` |

Save your edits, then refresh the browser. Keep the complete `dist` folder together; all five application files are required.

## 4. Read the documentation and run checks

- `README.md`: features, local setup, data fields, and limitations.
- `docs/HOW_IT_WORKS.md`: workflow, architecture, equations, and worked examples.

With Node.js available, run the existing automated checks from the project folder:

```bash
npm test
```

Node.js is only required for those checks. Python is serving the static website; it is not a Python backend or machine-learning model.

## Data and hosted version

The app starts with fictional demo data and heuristic risk scoring. There is no trained ML model connected.

Local watchlists, tasks, imports, and scenarios are stored separately from the hosted site's browser data. Editing and running this local copy does not automatically update the hosted site.
