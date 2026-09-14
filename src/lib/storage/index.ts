import "server-only";
import type { StorageDriver } from "@/lib/storage/types";
import { localDriver } from "@/lib/storage/local-driver";

/**
 * The single place that picks a storage driver by STORAGE_DRIVER (unset = "local").
 * Everything else in the app — attachment.service.ts is the only caller —
 * goes through the StorageDriver interface, never a driver's own module
 * directly, so adding "s3" or "google_drive" later is additive here only.
 */
export function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      return localDriver;
    default:
      throw new Error(`Unknown STORAGE_DRIVER "${driver}" — only "local" is implemented so far.`);
  }
}

export type { StorageDriver, SaveFileInput, SavedFile } from "@/lib/storage/types";
