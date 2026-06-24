// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Contents of a Google Service Account JSON key file.
 */
export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// ─── Sheet structure ─────────────────────────────────────────────────────────

/**
 * A single row from a Google Sheet, as returned by the Sheets API.
 * Each cell is a string (or undefined if the cell is empty).
 */
export type SheetRow = string[];

/**
 * Raw data for one tab/grid of a spreadsheet.
 * First row = header row (key column + language columns).
 * Subsequent rows = translation entries.
 */
export type SheetGrid = SheetRow[];

/**
 * Metadata about a single tab inside a spreadsheet.
 */
export interface SheetTab {
  /** Numeric ID of the tab inside the spreadsheet */
  sheetId: number;
  /** Display name of the tab */
  title: string;
}

// ─── Output data ─────────────────────────────────────────────────────────────

/**
 * A nested JSON object representing one language's translations.
 * Keys are strings; values are either nested objects or translation strings.
 *
 * @example
 * {
 *   "actions": {
 *     "add_comment": "Add a comment"
 *   }
 * }
 */
export type TranslationObject = {
  [key: string]: TranslationObject | string;
};

/**
 * The full extraction result, keyed by locale code.
 *
 * @example
 * {
 *   "en": { "actions": { "save": "Save" } },
 *   "fr": { "actions": { "save": "Enregistrer" } }
 * }
 */
export type TranslationMap = Record<string, TranslationObject>;

// ─── Key mapping ─────────────────────────────────────────────────────────────

/**
 * Maps raw column header values (as written in the sheet) to BCP-47
 * locale codes used as output file names.
 *
 * @example
 * { "French": "fr", "EN": "en", "繁體中文": "zh-TW" }
 */
export type LocaleKeyMap = Record<string, string>;

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Options for a single-spreadsheet extraction (sheet mode).
 */
export interface SheetModeOptions {
  mode: "sheet";
  /** Google Spreadsheet ID (from its URL) */
  spreadsheetId: string;
  /**
   * Numeric tab/grid ID to extract. When omitted, all tabs whose name
   * does not start with `_` are extracted and merged by namespace.
   */
  tabId?: number;
  /**
   * Zero-based column index to start reading from.
   * Useful when the sheet has leading columns you want to skip (e.g. comments).
   * Defaults to 0.
   */
  startColumn?: number;
}

/**
 * Options for a Google Drive folder extraction (folder mode).
 * Every spreadsheet found in the folder (non-recursively) is extracted.
 * Sub-folders are traversed recursively.
 */
export interface FolderModeOptions {
  mode: "folder";
  /** Google Drive folder ID (from its URL) */
  folderId: string;
}

/**
 * Union of the two supported extraction modes.
 */
export type ExtractionMode = SheetModeOptions | FolderModeOptions;

/**
 * Full configuration object accepted by the `extract()` programmatic API.
 */
export interface ExtractOptions {
  /** Authentication: path to a Service Account JSON file, or the parsed object */
  serviceAccountKey: string | ServiceAccountKey;

  /** Where and what to extract */
  source: ExtractionMode;

  /**
   * Directory where output JSON files will be written.
   * Created automatically if it does not exist.
   * @default "./i18n"
   */
  outputDir?: string;

  /**
   * Custom mapping from sheet column headers to locale codes.
   * Merged on top of the built-in default key map.
   * Entries in the spreadsheet's `_keymap` tab always take highest priority.
   */
  localeKeyMap?: LocaleKeyMap;

  /**
   * When true, keys with empty translation values are included in the output
   * with an empty string value. By default they are omitted.
   * @default false
   */
  includeEmpty?: boolean;

  /**
   * Output JSON indentation. Accepts a number of spaces or a string (e.g. "\t").
   * @default 2
   */
  indent?: number | string;
}

// ─── Result ──────────────────────────────────────────────────────────────────

/**
 * Information about a single written output file.
 */
export interface OutputFile {
  /** Locale code, e.g. "en" or "zh-TW" */
  locale: string;
  /** Absolute path to the written file */
  path: string;
  /** Number of top-level namespace keys in the file */
  keyCount: number;
}

/**
 * Result returned by the `extract()` function.
 */
export interface ExtractResult {
  /** List of files that were written */
  files: OutputFile[];
  /** Total wall-clock time in milliseconds */
  durationMs: number;
}
