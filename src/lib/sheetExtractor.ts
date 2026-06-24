import type { LocaleKeyMap, TranslationMap } from "../types/index.js";
import { getSpreadsheetTabs, getTabData } from "./sheetsClient.js";
import {
  buildLocaleKeyMap,
  parseGrid,
  parseKeymapGrid,
} from "./parser.js";

type AuthClient = Parameters<typeof getSpreadsheetTabs>[0];

export interface SheetExtractorOptions {
  auth: AuthClient;
  spreadsheetId: string;
  /** When provided, only this specific tab (by numeric ID) is extracted. */
  tabId?: number;
  /** Zero-based column to start reading from. */
  startColumn?: number;
  includeEmpty?: boolean;
  userKeyMap?: LocaleKeyMap;
}

/**
 * Extracts translations from a single Google Spreadsheet.
 *
 * - If `tabId` is given → only that tab is parsed, keys are NOT namespaced.
 * - If `tabId` is omitted → all non-internal tabs are parsed;
 *   each tab name becomes a namespace prefix (e.g. tab "actions" → key "actions.save").
 *
 * Tabs whose name starts with `_` are treated as internal and skipped,
 * except for `_keymap` which is parsed to build a custom locale key map.
 */
export async function extractFromSheet(
  options: SheetExtractorOptions
): Promise<TranslationMap> {
  const {
    auth,
    spreadsheetId,
    tabId,
    startColumn = 0,
    includeEmpty = false,
    userKeyMap,
  } = options;

  const result: TranslationMap = {};

  // 1. List all tabs
  const tabs = await getSpreadsheetTabs(auth, spreadsheetId);

  // 2. Check for a `_keymap` tab and parse it first
  let sheetKeyMap: LocaleKeyMap | undefined;
  const keymapTab = tabs.find((t) => t.title === "_keymap");
  if (keymapTab) {
    const grid = await getTabData(auth, spreadsheetId, keymapTab.title);
    sheetKeyMap = parseKeymapGrid(grid);
  }

  const keyMap = buildLocaleKeyMap(userKeyMap, sheetKeyMap);

  // 3. Determine which tabs to process
  let targetTabs = tabId !== undefined
    ? tabs.filter((t) => t.sheetId === tabId)
    : tabs.filter((t) => !t.title.startsWith("_"));

  if (targetTabs.length === 0) {
    throw new Error(
      tabId !== undefined
        ? `Tab with ID ${tabId} not found in spreadsheet ${spreadsheetId}.`
        : `No processable tabs found in spreadsheet ${spreadsheetId}.`
    );
  }

  // 4. Parse each tab
  for (const tab of targetTabs) {
    const grid = await getTabData(auth, spreadsheetId, tab.title);

    parseGrid(grid, result, {
      keyMap,
      // When a specific tab is requested, don't namespace the keys.
      // When scanning all tabs, use the tab name as namespace.
      namespace: tabId !== undefined ? undefined : tab.title,
      startColumn,
      includeEmpty,
    });
  }

  return result;
}
