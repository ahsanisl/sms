import "server-only";
import * as attachmentRepo from "@/repositories/attachments.repository";
import { getStorageDriver } from "@/lib/storage";
import { NotFoundError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { logAudit } from "@/services/audit.service";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/**
 * Shared attachment plumbing reused by Homework, Homework Submissions,
 * Classwork, and anything future — see src/lib/storage for the swappable
 * driver underneath. Deliberately has NO permission gate of its own: every
 * function here only enforces tenant isolation (the caller's own school).
 * The caller (homework.service, classwork.service, ...) is responsible for
 * authorizing the *owning entity* first — e.g. "can this parent see this
 * homework" — before ever reaching in here.
 */
export async function saveAttachment(session: AuthSession, module: string, entityId: string, file: File) {
  const schoolId = requireSchoolId(session);
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("Files must be 15MB or smaller.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("That file type isn't supported. Allowed: PDF, images, Word, Excel, and PowerPoint files.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const driver = getStorageDriver();
  const saved = await driver.save({ schoolId, module, buffer, fileName: file.name, mimeType: file.type });

  const created = await attachmentRepo.createAttachment({
    schoolId,
    module,
    entityId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: saved.sizeBytes,
    storageDriver: "local",
    storageKey: saved.storageKey,
    uploadedBy: session.userId,
  });
  await logAudit(session, "attachment.uploaded", "Attachment", created.id, { module, entityId, fileName: file.name });
  return created;
}

export async function listAttachments(session: AuthSession, module: string, entityId: string) {
  const schoolId = requireSchoolId(session);
  const rows = await attachmentRepo.listAttachments(module, entityId);
  return rows.filter((r) => r.schoolId === schoolId);
}

/** Tenant-isolation only — see the module note above. Callers must independently authorize the owning entity before a download is allowed to reach this far. */
export async function getAttachmentForDownload(session: AuthSession, attachmentId: string) {
  const schoolId = requireSchoolId(session);
  const attachment = await attachmentRepo.getAttachment(attachmentId);
  if (!attachment || attachment.schoolId !== schoolId) throw new NotFoundError("File");
  const driver = getStorageDriver();
  const buffer = await driver.read(attachment.storageKey);
  return { attachment, buffer };
}

export async function deleteAttachment(session: AuthSession, attachmentId: string) {
  const schoolId = requireSchoolId(session);
  const attachment = await attachmentRepo.getAttachment(attachmentId);
  if (!attachment || attachment.schoolId !== schoolId) throw new NotFoundError("File");
  const driver = getStorageDriver();
  await driver.delete(attachment.storageKey);
  await attachmentRepo.deleteAttachment(attachmentId);
  await logAudit(session, "attachment.deleted", "Attachment", attachmentId, { module: attachment.module, entityId: attachment.entityId, fileName: attachment.fileName });
}
