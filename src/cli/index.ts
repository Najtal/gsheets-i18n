#!/usr/bin/env node
import { Command } from "commander";
import { extract } from "../index.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIndent(value: string): number | string {
  if (value === "tab" || value === "\t") return "\t";
  const num = Number(value);
  if (!Number.isNaN(num) && num >= 0 && num <= 8) return num;
  throw new Error(`Invalid indent value: "${value}". Use a number 0–8 or "tab".`);
}

function fatal(message: string): void {
  console.error(`\n  ✖  ${message}\n`);
  process.exit(1);
}

// ─── CLI definition ───────────────────────────────────────────────────────────

const program = new Command();

program
  .name("sheets-i18n")
  .description(
    "Generate i18n JSON files from a Google Spreadsheet or Drive folder."
  )
  .version("1.0.2");

// ── sheet command ─────────────────────────────────────────────────────────────
program
  .command("sheet")
  .description("Extract from a single Google Spreadsheet")
  .requiredOption(
    "-s, --sheet-id <spreadsheetId>",
    "Google Spreadsheet ID (from the URL)"
  )
  .requiredOption(
    "-k, --key <path>",
    "Path to the Service Account JSON key file",
    "./service-account.json"
  )
  .option(
    "-o, --out <path>",
    "Output directory for the generated JSON files",
    "./i18n"
  )
  .option(
    "-t, --tab-id <id>",
    "Numeric tab ID to extract (default: all tabs)"
  )
  .option(
    "--start-column <n>",
    "Zero-based column index to start reading from",
    "0"
  )
  .option(
    "--include-empty",
    "Include keys with empty values in the output",
    false
  )
  .option(
    "--indent <value>",
    'JSON indentation: a number of spaces or "tab"',
    "2"
  )
  .option(
    "--key-map <path>",
    "Path to a JSON file with custom locale key mappings"
  )
  .action(async (opts: {
    sheetId: string;
    key: string;
    out: string;
    tabId?: string;
    startColumn: string;
    includeEmpty: boolean;
    indent: string;
    keyMap?: string;
  }) => {
    let localeKeyMap: Record<string, string> | undefined;

    if (opts.keyMap) {
      try {
        const raw = await readFile(resolve(process.cwd(), opts.keyMap), "utf-8");
        localeKeyMap = JSON.parse(raw) as Record<string, string>;
      } catch {
        fatal(`Could not read key map file: ${opts.keyMap}`);
        return;
      }
    }

    console.log("\n  ⏳  Extracting translations…\n");

    try {
      const result = await extract({
        serviceAccountKey: opts.key,
        source: {
          mode: "sheet",
          spreadsheetId: opts.sheetId,
          tabId: opts.tabId !== undefined ? Number(opts.tabId) : undefined,
          startColumn: Number(opts.startColumn),
        },
        outputDir: opts.out,
        localeKeyMap,
        includeEmpty: opts.includeEmpty,
        indent: parseIndent(opts.indent),
      });

      console.log(`  ✔  Done in ${(result.durationMs / 1000).toFixed(2)}s\n`);
      console.log(`  📂  ${resolve(process.cwd(), opts.out)}\n`);
      for (const file of result.files) {
        console.log(`      ${file.locale}.json  (${file.keyCount} top-level keys)`);
      }
      console.log();
    } catch (err) {
      fatal(err instanceof Error ? err.message : String(err));
    }
  });

// ── folder command ────────────────────────────────────────────────────────────
program
  .command("folder")
  .description("Extract from all spreadsheets inside a Google Drive folder")
  .requiredOption(
    "-f, --folder-id <folderId>",
    "Google Drive folder ID (from the URL)"
  )
  .requiredOption(
    "-k, --key <path>",
    "Path to the Service Account JSON key file",
    "./service-account.json"
  )
  .option(
    "-o, --out <path>",
    "Output directory for the generated JSON files",
    "./i18n"
  )
  .option(
    "--include-empty",
    "Include keys with empty values in the output",
    false
  )
  .option(
    "--indent <value>",
    'JSON indentation: a number of spaces or "tab"',
    "2"
  )
  .option(
    "--key-map <path>",
    "Path to a JSON file with custom locale key mappings"
  )
  .action(async (opts: {
    folderId: string;
    key: string;
    out: string;
    includeEmpty: boolean;
    indent: string;
    keyMap?: string;
  }) => {
    let localeKeyMap: Record<string, string> | undefined;

    if (opts.keyMap) {
      try {
        const raw = await readFile(resolve(process.cwd(), opts.keyMap), "utf-8");
        localeKeyMap = JSON.parse(raw) as Record<string, string>;
      } catch {
        fatal(`Could not read key map file: ${opts.keyMap}`);
        return;
      }
    }

    console.log("\n  ⏳  Extracting translations…\n");

    try {
      const result = await extract({
        serviceAccountKey: opts.key,
        source: {
          mode: "folder",
          folderId: opts.folderId,
        },
        outputDir: opts.out,
        localeKeyMap,
        includeEmpty: opts.includeEmpty,
        indent: parseIndent(opts.indent),
      });

      console.log(`  ✔  Done in ${(result.durationMs / 1000).toFixed(2)}s\n`);
      console.log(`  📂  ${resolve(process.cwd(), opts.out)}\n`);
      for (const file of result.files) {
        console.log(`      ${file.locale}.json  (${file.keyCount} top-level keys)`);
      }
      console.log();
    } catch (err) {
      fatal(err instanceof Error ? err.message : String(err));
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────
program.parse();
