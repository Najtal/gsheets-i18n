# gsheets-i18n

Generate i18n JSON files from a Google Translation in Google Sheets 
Translate in a versioned web envitonment, and use as a CLI tool or a Node.js library to push into your project.

Each tab of your spreadsheet becomes a **namespace**, each row a **translation key**, and each language column an output file. The result is one `<locale>.json` file per language, with nested keys, ready to drop into React i18next, Vue i18n, or any similar framework.


![Alt text](https://example.com/image.jpg)

---

## Table of Contents

- [How it works](#how-it-works)
- [Installation](#installation)
- [Google Setup](#google-setup)
- [Spreadsheet Format](#spreadsheet-format)
- [CLI Usage](#cli-usage)
- [Programmatic API](#programmatic-api)
- [Key Mapping](#key-mapping)
- [Folder Mode](#folder-mode)
- [Configuration Reference](#configuration-reference)

---

## How it works

```
Google Spreadsheet
┌─────────────────────────────────────────────┐
│ Tab: "actions"                              │
│ key              │ EN       │ FR            │
│ save             │ Save     │ Enregistrer   │
│ cancel           │ Cancel   │ Annuler       │
│                             │               │
│ Tab: "errors"               │               │
│ key              │ EN       │ FR            │
│ not_found        │ Not found│ Introuvable   │
└─────────────────────────────────────────────┘
             │
             ▼  gsheets-i18n
             
en.json                         fr.json
{                               {
  "actions": {                    "actions": {
    "save": "Save",                 "save": "Enregistrer",
    "cancel": "Cancel"              "cancel": "Annuler"
  },                            },
  "errors": {                     "errors": {
    "not_found": "Not found"        "not_found": "Introuvable"
  }                             }
}                               }
```

In your code you then access translations with dotted paths:

```ts
t("actions.save")       // → "Save"
t("errors.not_found")   // → "Not found"
```

---

## Installation

```bash
# As a dev dependency (recommended for most projects)
npm install --save-dev gsheets-i18n

# Or globally for CLI use
npm install -g gsheets-i18n
```

**Requirements:** Node.js ≥ 18

---

## Google Setup

### 1. Create a Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → Service Account**
5. Give it a name and click **Done**
6. Open the service account, go to **Keys → Add Key → Create new key → JSON**
7. Download the JSON file — this is your `service-account.json`

### 2. Enable the required APIs

In **APIs & Services → Enabled APIs**, enable:

- **Google Sheets API**
- **Google Drive API** ← only required for [folder mode](#folder-mode)

### 3. Share your spreadsheet with the service account

Open your Google Spreadsheet, click **Share**, and add the service account email (looks like `name@project.iam.gserviceaccount.com`) with **Viewer** permissions.

> ⚠️ Keep `service-account.json` out of version control. Add it to `.gitignore`.

---

## Spreadsheet Format

### Basic structure

Each **tab** represents a namespace. Rows are translation keys, columns are languages.

```
┌──────────────────┬──────────────┬────────────────┬────────────────┐
│ key              │ EN           │ FR             │ DE             │
├──────────────────┼──────────────┼────────────────┼────────────────┤
│ save             │ Save         │ Enregistrer    │ Speichern      │
│ cancel           │ Cancel       │ Annuler        │ Abbrechen      │
│ confirm          │ Confirm      │ Confirmer      │ Bestätigen     │
└──────────────────┴──────────────┴────────────────┴────────────────┘
```

- **Row 1** — Header row: first cell is ignored (label for the key column), remaining cells are language identifiers.
- **Column A** — Translation key. Supports **dot notation** for nesting: `modal.title` → `{ modal: { title: "…" } }`.
- **Other columns** — One language per column. The header value is mapped to a locale code (see [Key Mapping](#key-mapping)).

### Skipping tabs and columns

Prefix a tab name or column header with `_` to exclude it from output:

```
Tab name "_notes"     → ignored entirely
Column header "_dev"  → ignored entirely
```

### Dot notation in keys

Use dots in your key to create nested output objects:

```
key                     │ EN
modal.title             │ Confirm action
modal.body              │ Are you sure?
modal.actions.confirm   │ Yes, proceed
modal.actions.cancel    │ Go back
```

Produces:

```json
{
  "modal": {
    "title": "Confirm action",
    "body": "Are you sure?",
    "actions": {
      "confirm": "Yes, proceed",
      "cancel": "Go back"
    }
  }
}
```

### Multiple tabs

Each tab becomes a top-level namespace in the output:

```
Tab "actions" + key "save"   → { "actions": { "save": "…" } }
Tab "errors"  + key "404"    → { "errors":  { "404":  "…" } }
```

---

## CLI Usage

### Sheet mode

Extract from a single spreadsheet (all non-internal tabs):

```bash
gsheets-i18n sheet \
  --sheet-id 4BxiM*****pms \
  --key ./service-account.json \
  --out ./src/locales
```

Extract only one specific tab (by its numeric tab ID):

```bash
gsheets-i18n sheet \
  --sheet-id 4BxiM*****pms \
  --key ./service-account.json \
  --tab-id 0 \
  --out ./src/locales
```

> **Finding the tab ID:** Right-click a tab in your browser → "Copy link" — the URL contains `#gid=<tabId>`.

### Folder mode

Scan a Drive folder recursively and extract from every spreadsheet found:

```bash
gsheets-i18n folder \
  --folder-id 1A2B3C4D5E6F7G8H9I0J \
  --key ./service-account.json \
  --out ./src/locales
```

### Output example

```
  ✔  Done in 1.24s

  📂  /your/project/src/locales

      de.json  (3 top-level keys)
      en.json  (3 top-level keys)
      fr.json  (3 top-level keys)
```

### Adding to package.json scripts

```json
{
  "scripts": {
    "i18n:pull": "gsheets-i18n sheet --sheet-id YOUR_ID --key ./service-account.json --out ./src/locales"
  }
}
```

---

## Programmatic API

```ts
import { extract } from "gsheets-i18n";

const result = await extract({
  serviceAccountKey: "./service-account.json",
  source: {
    mode: "sheet",
    spreadsheetId: "4BxiM*****pms",
  },
  outputDir: "./src/locales",
});

console.log(`Generated ${result.files.length} files in ${result.durationMs}ms`);
// → Generated 3 files in 1240ms

for (const file of result.files) {
  console.log(`${file.locale}: ${file.path} (${file.keyCount} keys)`);
}
```

The `extract()` function returns a `Promise<ExtractResult>`:

```ts
interface ExtractResult {
  files: OutputFile[];   // One entry per generated file
  durationMs: number;    // Total wall-clock time
}

interface OutputFile {
  locale: string;        // e.g. "en", "fr", "zh-TW"
  path: string;          // Absolute path to the written file
  keyCount: number;      // Number of top-level namespace keys
}
```

---

## Key Mapping

Column headers in your sheet are mapped to BCP-47 locale codes. A wide range of spellings is supported out of the box:

| Header in sheet            | Output locale code |
|----------------------------|--------------------|
| `EN`, `ENG`, `English`     | `en`               |
| `FR`, `FRE`, `French`, `Français` | `fr`      |
| `DE`, `GER`, `German`, `Deutsch`  | `de`      |
| `ZH-TW`, `CHT`, `繁體中文`  | `zh-TW`            |
| `ZH-CN`, `CHS`, `简体中文`  | `zh-CN`            |
| `JA`, `JPN`, `Japanese`, `日本語` | `ja`      |
| … and many more            |                    |

### Custom key map via the spreadsheet

Add a tab named `_keymap` to your spreadsheet to define project-specific mappings:

```
┌──────────────┬───────┬──────┬───────┐
│ (ignored)    │ fr    │ en   │ pt-BR │
├──────────────┼───────┼──────┼───────┤
│ Français     │ fr    │      │       │
│ Anglais      │       │ en   │       │
│ Brésilien    │       │      │ pt-BR │
└──────────────┴───────┴──────┴───────┘
```

### Custom key map via CLI or API

Pass a JSON file to the CLI:

```bash
gsheets-i18n sheet --sheet-id … --key-map ./my-key-map.json
```

Or pass an object to the API:

```ts
await extract({
  // …
  localeKeyMap: {
    "Français": "fr",
    "Anglais": "en",
    "Brésilien": "pt-BR",
  },
});
```

**Priority (highest → lowest):**
1. `_keymap` tab in the spreadsheet
2. `localeKeyMap` option / `--key-map` file
3. Built-in defaults

---

## Folder Mode

In folder mode, the library recursively scans a Google Drive folder:

- Each **sub-folder** name becomes a path component of the namespace
- Each **spreadsheet** name becomes the innermost namespace component
- Files and folders starting with `_` are **skipped**
- A spreadsheet named `_keymap` in any folder applies its mappings to everything inside that folder

**Example Drive structure:**

```
📁 my-translations/
├── 📁 app/
│   ├── 📄 actions      ← spreadsheet
│   └── 📄 errors       ← spreadsheet
└── 📄 common           ← spreadsheet
```

Produces keys structured as:

```json
{
  "app": {
    "actions": { "save": "…" },
    "errors":  { "404": "…" }
  },
  "common": { "yes": "…" }
}
```

---

## Configuration Reference

### `extract(options)` — full options

| Option              | Type                        | Default                  | Description |
|---------------------|-----------------------------|--------------------------|-------------|
| `serviceAccountKey` | `string \| ServiceAccountKey` | *(required)*           | Path to key file or parsed key object |
| `source`            | `SheetModeOptions \| FolderModeOptions` | *(required)* | What to extract |
| `outputDir`         | `string`                    | `"./i18n"`               | Directory for output files |
| `localeKeyMap`      | `Record<string, string>`    | `{}`                     | Custom header → locale mappings |
| `includeEmpty`      | `boolean`                   | `false`                  | Write keys with empty values |
| `indent`            | `number \| string`          | `2`                      | JSON indentation (`2`, `4`, `"\t"`) |

### `SheetModeOptions`

| Option          | Type     | Default | Description |
|-----------------|----------|---------|-------------|
| `mode`          | `"sheet"` | *(required)* | |
| `spreadsheetId` | `string` | *(required)* | Google Spreadsheet ID |
| `tabId`         | `number` | all tabs | Specific tab to extract |
| `startColumn`   | `number` | `0`     | Skip leading columns |

### `FolderModeOptions`

| Option     | Type      | Default | Description |
|------------|-----------|---------|-------------|
| `mode`     | `"folder"` | *(required)* | |
| `folderId` | `string`  | *(required)* | Google Drive folder ID |

### CLI flags — `sheet` command

| Flag                      | Default                  | Description |
|---------------------------|--------------------------|-------------|
| `-s, --sheet-id <id>`     | *(required)*             | Spreadsheet ID |
| `-k, --key <path>`        | `./service-account.json` | Key file path |
| `-o, --out <path>`        | `./i18n`                 | Output directory |
| `-t, --tab-id <id>`       | all tabs                 | Numeric tab ID |
| `--start-column <n>`      | `0`                      | Skip leading columns |
| `--include-empty`         | `false`                  | Include empty values |
| `--indent <n\|"tab">`     | `2`                      | JSON indentation |
| `--key-map <path>`        | —                        | Custom key map JSON |

### CLI flags — `folder` command

| Flag                  | Default                  | Description |
|-----------------------|--------------------------|-------------|
| `-f, --folder-id <id>` | *(required)*            | Drive folder ID |
| `-k, --key <path>`    | `./service-account.json` | Key file path |
| `-o, --out <path>`    | `./i18n`                 | Output directory |
| `--include-empty`     | `false`                  | Include empty values |
| `--indent <n\|"tab">` | `2`                      | JSON indentation |
| `--key-map <path>`    | —                        | Custom key map JSON |

---

## License

MIT
