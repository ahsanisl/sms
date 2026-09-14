/**
 * The one interface every storage driver implements — swapping "local" for
 * "s3" or a per-school "google_drive" driver later means adding a new file
 * here and one line in index.ts, never touching a service or component that
 * calls getStorageDriver(). See attachment.service.ts for the only caller.
 */
export interface SaveFileInput {
  /** Tenant-separates files on disk too, even though disk access is never exposed directly — defense in depth. */
  schoolId: string;
  /** Free text, same convention as role_permissions.module — e.g. "homework", "classwork", "curriculum_topic". */
  module: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface SavedFile {
  storageKey: string;
  sizeBytes: number;
}

export interface StorageDriver {
  save(input: SaveFileInput): Promise<SavedFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
