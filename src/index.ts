import { createAuthClient } from "./lib/auth.js";
import { extractFromSheet } from "./lib/sheetExtractor.js";
import { extractFromFolder } from "./lib/folderExtractor.js";
import { writeTranslationFiles } from "./lib/writer.js";
import type { ExtractOptions, ExtractResult } from "./types/index.js";

export type {
  ExtractOptions,
  ExtractResult,
  ExtractionMode,
  SheetModeOptions,
  FolderModeOptions,
  OutputFile,
  TranslationMap,
  TranslationObject,
  LocaleKeyMap,
  ServiceAccountKey,
} from "./types/index.js";

/**
 * Extracts translations from Google Sheets and writes one JSON file per locale.
 *
 * @example
 * ```ts
 * import { extract } from "sheets-i18n";
 *
 * await extract({
 *   serviceAccountKey: "./service-account.json",
 *   source: {
 *     mode: "sheet",
 *     spreadsheetId: "4BxiM********upms",
 *   },
 *   outputDir: "./src/locales",
 * });
 * ```
 */
export async function extract(options: ExtractOptions): Promise<ExtractResult> {
  const startTime = Date.now();

  const {
    serviceAccountKey,
    source,
    outputDir = "./i18n",
    localeKeyMap,
    includeEmpty = false,
    indent = 2,
  } = options;

  // 1. Authenticate
  const auth = await createAuthClient(serviceAccountKey);

  // 2. Extract translations
  let translations;

  if (source.mode === "sheet") {
    translations = await extractFromSheet({
      auth,
      spreadsheetId: source.spreadsheetId,
      tabId: source.tabId,
      startColumn: source.startColumn,
      includeEmpty,
      userKeyMap: localeKeyMap,
    });
  } else {
    translations = await extractFromFolder({
      auth,
      folderId: source.folderId,
      includeEmpty,
      userKeyMap: localeKeyMap,
    });
  }

  // 3. Write files
  const files = await writeTranslationFiles(translations, outputDir, indent);

  return {
    files,
    durationMs: Date.now() - startTime,
  };
}
