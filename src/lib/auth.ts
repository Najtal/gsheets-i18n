import { google } from "googleapis";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ServiceAccountKey } from "../types/index.js";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

/**
 * Builds an authenticated Google JWT client from a Service Account key.
 *
 * @param keySource - Either a file-system path to the key JSON, or the parsed object.
 */
export async function createAuthClient(
  keySource: string | ServiceAccountKey
): Promise<InstanceType<typeof google.auth.JWT>> {
  let key: ServiceAccountKey;

  if (typeof keySource === "string") {
    const absolutePath = resolve(process.cwd(), keySource);
    const raw = await readFile(absolutePath, "utf-8");
    key = JSON.parse(raw) as ServiceAccountKey;
  } else {
    key = keySource;
  }

  const client = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: SCOPES,
  });

  await client.authorize();
  return client;
}
