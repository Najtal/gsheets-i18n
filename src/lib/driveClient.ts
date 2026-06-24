import { google } from "googleapis";

type AuthClient = Parameters<typeof google.drive>[0]["auth"];

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const MIME_SHEET = "application/vnd.google-apps.spreadsheet";
const MIME_FOLDER = "application/vnd.google-apps.folder";

/**
 * Lists all files and sub-folders directly inside a Drive folder.
 * Handles pagination automatically.
 */
export async function listFolderContents(
  auth: AuthClient,
  folderId: string
): Promise<DriveFile[]> {
  const drive = google.drive({ version: "v3", auth });
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, mimeType)",
      ...(pageToken ? { pageToken } : {}),
    });

    const page = response.data.files ?? [];
    for (const f of page) {
      if (f.id && f.name && f.mimeType) {
        files.push({ id: f.id, name: f.name, mimeType: f.mimeType });
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export function isSpreadsheet(file: DriveFile): boolean {
  return file.mimeType === MIME_SHEET;
}

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === MIME_FOLDER;
}

/** Files/folders whose name starts with `_` are treated as internal/skipped. */
export function isInternal(file: DriveFile): boolean {
  return file.name.startsWith("_");
}

/** A keymap sheet is a spreadsheet named `_keymap` (internal, but special). */
export function isKeymapSheet(file: DriveFile): boolean {
  return isSpreadsheet(file) && file.name === "_keymap";
}
