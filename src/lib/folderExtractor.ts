import type { LocaleKeyMap, TranslationMap } from "../types/index.js";
import {
  listFolderContents,
  isSpreadsheet,
  isFolder,
  isInternal,
  isKeymapSheet,
} from "./driveClient.js";
import { getTabData } from "./sheetsClient.js";
import {
  buildLocaleKeyMap,
  parseGrid,
  parseKeymapGrid,
} from "./parser.js";

type AuthClient = Parameters<typeof listFolderContents>[0];

export interface FolderExtractorOptions {
  auth: AuthClient;
  folderId: string;
  includeEmpty?: boolean;
  userKeyMap?: LocaleKeyMap;
}

/**
 * Recursively extracts translations from all spreadsheets inside a Drive folder.
 *
 * Naming conventions:
 * - Files/folders starting with `_` are skipped (treated as internal).
 * - A spreadsheet named exactly `_keymap` inside a folder provides locale
 *   key mappings that apply to all sheets in that folder.
 * - Each spreadsheet's name is used as a namespace path component.
 * - Sub-folder names become path components (e.g. folder `common` containing
 *   sheet `buttons` → namespace `common.buttons`).
 */
export async function extractFromFolder(
  options: FolderExtractorOptions
): Promise<TranslationMap> {
  const { auth, folderId, includeEmpty = false, userKeyMap } = options;
  const result: TranslationMap = {};

  await scanFolder(auth, folderId, [], result, {
    includeEmpty,
    userKeyMap,
    inheritedKeyMap: buildLocaleKeyMap(userKeyMap),
  });

  return result;
}

interface ScanOptions {
  includeEmpty: boolean;
  userKeyMap?: LocaleKeyMap;
  inheritedKeyMap: LocaleKeyMap;
}

async function scanFolder(
  auth: AuthClient,
  folderId: string,
  namespacePath: string[],
  result: TranslationMap,
  options: ScanOptions
): Promise<void> {
  const { includeEmpty, userKeyMap } = options;
  let { inheritedKeyMap } = options;

  const files = await listFolderContents(auth, folderId);

  // 1. Check for a `_keymap` spreadsheet in this folder and merge it
  const keymapSheet = files.find(isKeymapSheet);
  if (keymapSheet) {
    const grid = await getTabData(auth, keymapSheet.id);
    const folderKeyMap = parseKeymapGrid(grid);
    inheritedKeyMap = buildLocaleKeyMap(userKeyMap, {
      ...inheritedKeyMap,
      ...folderKeyMap,
    });
  }

  // 2. Recurse into non-internal sub-folders
  const subFolders = files.filter((f) => isFolder(f) && !isInternal(f));
  for (const folder of subFolders) {
    await scanFolder(auth, folder.id, [...namespacePath, folder.name], result, {
      includeEmpty,
      userKeyMap,
      inheritedKeyMap,
    });
  }

  // 3. Process non-internal spreadsheets
  const sheets = files.filter((f) => isSpreadsheet(f) && !isInternal(f));
  for (const sheet of sheets) {
    const grid = await getTabData(auth, sheet.id);
    const namespace = [...namespacePath, sheet.name].join(".");

    parseGrid(grid, result, {
      keyMap: inheritedKeyMap,
      namespace,
      includeEmpty,
    });
  }
}
