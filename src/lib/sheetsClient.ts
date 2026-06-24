import { google } from "googleapis";
import type { SheetGrid, SheetTab } from "../types/index.js";

type AuthClient = Parameters<typeof google.sheets>[0]["auth"];

/**
 * Lists all tabs in a spreadsheet and returns their metadata.
 */
export async function getSpreadsheetTabs(
  auth: AuthClient,
  spreadsheetId: string
): Promise<SheetTab[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.get({ spreadsheetId });

  const rawSheets = response.data.sheets ?? [];
  return rawSheets
    .map((s: { properties?: { sheetId?: number | null; title?: string | null } }) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
    }))
    .filter((s: { title: string }) => s.title !== "");
}

/**
 * Fetches all cell values from a single tab of a spreadsheet.
 *
 * @param tabName - The display name of the tab. When omitted, the first tab is used.
 */
export async function getTabData(
  auth: AuthClient,
  spreadsheetId: string,
  tabName?: string
): Promise<SheetGrid> {
  const sheets = google.sheets({ version: "v4", auth });

  // Encode the tab name to handle special characters (spaces, apostrophes, etc.)
  const range = tabName
    ? `'${tabName.replace(/'/g, "\\'")}'!A1:ZZ9999`
    : "A1:ZZ9999";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as SheetGrid | null) ?? [];
}
