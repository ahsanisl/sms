import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { SaveFileInput, SavedFile, StorageDriver } from "@/lib/storage/types";

// Deliberately outside `public/` — a file here is never reachable by a plain
// URL, only through the authenticated /api/files/[attachmentId] route (see
// that route for the actual authorization check). `storage/uploads` is
// project-root-relative, gitignored, and created on first write if missing.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

/** Strips anything that isn't a safe filename character — the stored key still gets a random uuid prefix, this just keeps the human-readable suffix inert. */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}

/** Resolves a storageKey to an absolute path, rejecting anything that would escape STORAGE_ROOT (a malformed or tampered key should never let a read/delete reach outside the upload directory). */
function resolveSafePath(storageKey: string): string {
  const resolved = path.resolve(STORAGE_ROOT, storageKey);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep) && resolved !== STORAGE_ROOT) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export const localDriver: StorageDriver = {
  async save({ schoolId, module, buffer, fileName }: SaveFileInput): Promise<SavedFile> {
    const storageKey = path.posix.join(schoolId, module, `${randomUUID()}-${sanitizeFileName(fileName)}`);
    const absolutePath = resolveSafePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { storageKey, sizeBytes: buffer.byteLength };
  },

  async read(storageKey: string): Promise<Buffer> {
    return readFile(resolveSafePath(storageKey));
  },

  async delete(storageKey: string): Promise<void> {
    await rm(resolveSafePath(storageKey), { force: true });
  },
};
