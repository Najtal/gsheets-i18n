import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { OutputFile, TranslationMap } from "../types/index.js";

/**
 * Writes one JSON file per locale into `outputDir`.
 * Creates the directory (and any parents) if it does not exist.
 *
 * @returns Metadata about each file that was written.
 */
export async function writeTranslationFiles(
  translations: TranslationMap,
  outputDir: string,
  indent: number | string = 2
): Promise<OutputFile[]> {
  const absoluteDir = resolve(process.cwd(), outputDir);
  await mkdir(absoluteDir, { recursive: true });

  const outputs: OutputFile[] = [];

  for (const [locale, translationObject] of Object.entries(translations)) {
    // Skip entirely empty locale objects
    if (Object.keys(translationObject).length === 0) continue;

    const filePath = join(absoluteDir, `${locale}.json`);
    const content = JSON.stringify(translationObject, null, indent);

    await writeFile(filePath, content, "utf-8");

    outputs.push({
      locale,
      path: filePath,
      keyCount: Object.keys(translationObject).length,
    });
  }

  // Sort output list by locale code for deterministic logging
  outputs.sort((a, b) => a.locale.localeCompare(b.locale));

  return outputs;
}
