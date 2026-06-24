import type {
  LocaleKeyMap,
  SheetGrid,
  SheetRow,
  TranslationMap,
  TranslationObject,
} from "../types/index.js";
import { DEFAULT_LOCALE_KEY_MAP } from "./defaultKeyMap.js";

// ─── Key map resolution ───────────────────────────────────────────────────────

/**
 * Merges the default key map with any user-supplied overrides and an optional
 * `_keymap` tab extracted from the spreadsheet itself.
 *
 * Priority (highest → lowest):
 *   1. Spreadsheet `_keymap` tab
 *   2. `localeKeyMap` option passed by the caller
 *   3. Built-in `DEFAULT_LOCALE_KEY_MAP`
 */
export function buildLocaleKeyMap(
  userKeyMap?: LocaleKeyMap,
  sheetKeyMap?: LocaleKeyMap
): LocaleKeyMap {
  return {
    ...DEFAULT_LOCALE_KEY_MAP,
    ...(userKeyMap ?? {}),
    ...(sheetKeyMap ?? {}),
  };
}

/**
 * Parses a `_keymap` tab (either from a dedicated sheet or from a tab named
 * `_keymap` inside a spreadsheet).
 *
 * Expected layout:
 * ```
 * | locale code | fr    | en      | de     |
 * | header name | French| English | German |
 * ```
 * Row 0 = locale codes (output keys), Row 1+ = header name variants.
 */
export function parseKeymapGrid(grid: SheetGrid): LocaleKeyMap {
  if (grid.length < 2) return {};
  const [localeCodes, ...headerRows] = grid;
  const result: LocaleKeyMap = {};

  for (const row of headerRows) {
    row.forEach((headerVariant, colIndex) => {
      if (colIndex === 0 || !headerVariant) return;
      const locale = localeCodes[colIndex];
      if (locale) result[headerVariant] = locale;
    });
  }

  return result;
}

// ─── Nested key assignment ────────────────────────────────────────────────────

/**
 * Sets a value at a dotted path inside a nested object, creating intermediate
 * objects as needed.
 *
 * @example
 * setNestedValue({}, "actions.save", "Save")
 * // → { actions: { save: "Save" } }
 */
export function setNestedValue(
  obj: TranslationObject,
  dotPath: string,
  value: string
): void {
  const parts = dotPath.split(".");
  let cursor: TranslationObject = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof cursor[part] !== "object" || cursor[part] === null) {
      cursor[part] = {};
    }
    cursor = cursor[part] as TranslationObject;
  }

  cursor[parts[parts.length - 1]] = value;
}

// ─── Grid parsing ─────────────────────────────────────────────────────────────

export interface ParseGridOptions {
  /** Resolved locale key map to translate header labels → locale codes. */
  keyMap: LocaleKeyMap;
  /**
   * Namespace prefix to prepend to every key, separated by a dot.
   * When provided, `"save"` becomes `"<namespace>.save"` in the output.
   */
  namespace?: string;
  /** Zero-based column index to start reading from. Defaults to 0. */
  startColumn?: number;
  /** When true, empty translation values are written as "". Defaults to false. */
  includeEmpty?: boolean;
}

/**
 * Parses a single sheet grid and merges all found translations into `result`.
 *
 * Expected grid layout:
 * ```
 * | key (ignored)  | EN      | FR      | DE      |
 * | actions.save   | Save    | Enreg.  | Speich. |
 * | actions.cancel | Cancel  | Annuler | Abbruch |
 * ```
 *
 * Column 0 is always the key column.
 * Column 1 is the first language (index 1 in the header row).
 */
export function parseGrid(
  grid: SheetGrid,
  result: TranslationMap,
  options: ParseGridOptions
): void {
  const { keyMap, namespace, startColumn = 0, includeEmpty = false } = options;

  if (grid.length < 2) return;

  const [headerRow, ...dataRows] = grid;
  const slicedHeader: SheetRow = headerRow.slice(startColumn);

  // Map column index (relative to startColumn) → resolved locale code.
  // Column 0 of the sliced header is the key column — skip it (index starts at 1).
  const columnLocales: Array<string | null> = slicedHeader.map((cell, i) => {
    if (i === 0) return null; // key column
    const resolved = keyMap[cell] ?? cell;
    // Skip columns whose name/locale starts with "_" (internal metadata)
    return resolved.startsWith("_") ? null : resolved;
  });

  for (const row of dataRows) {
    const slicedRow = row.slice(startColumn);
    const translationKey = slicedRow[0]?.trim();

    if (!translationKey) continue;

    const fullKey = namespace ? `${namespace}.${translationKey}` : translationKey;

    slicedRow.slice(1).forEach((value, colOffset) => {
      const locale = columnLocales[colOffset + 1];
      if (!locale) return;

      const trimmedValue = value?.trim() ?? "";
      if (!trimmedValue && !includeEmpty) return;

      if (!result[locale]) result[locale] = {};
      setNestedValue(result[locale], fullKey, trimmedValue);
    });
  }
}
