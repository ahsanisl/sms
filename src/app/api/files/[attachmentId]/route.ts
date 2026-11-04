import { requireSession, NotFoundError, UnauthenticatedError, PermissionError } from "@/lib/tenancy";
import * as attachmentService from "@/services/attachment.service";

/**
 * Authenticated file download — the only way an attachment's bytes are ever
 * served (files live outside `public/`, see src/lib/storage). Two layers:
 * (1) attachmentService.getAttachmentForDownload enforces tenant isolation
 * (same school only), (2) assertCanViewOwner below re-runs the *exact* same
 * ownership/permission check the owning domain's own read path uses — a
 * file request is authorized exactly like viewing the record it's attached
 * to would be, never more loosely. Extend the switch below as each new
 * attachable domain lands (Homework Submissions land with Homework).
 */
async function assertCanViewOwner(module: string, entityId: string) {
  switch (module) {
    case "homework": {
      const { getHomeworkWithStatus } = await import("@/services/homework.service");
      await getHomeworkWithStatus(await requireSession(), entityId);
      return;
    }
    case "homework_submission": {
      const { getSubmissionOwnerCheck } = await import("@/services/homework.service");
      await getSubmissionOwnerCheck(await requireSession(), entityId);
      return;
    }
    case "classwork": {
      const { getClasswork } = await import("@/services/classwork.service");
      await getClasswork(await requireSession(), entityId);
      return;
    }
    case "expense": {
      // A receipt is visible to anyone who can see the expense it's attached to.
      const { getExpense } = await import("@/services/expense.service");
      await getExpense(await requireSession(), entityId);
      return;
    }
    default:
      throw new NotFoundError("File");
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  try {
    const session = await requireSession();
    const { attachment, buffer } = await attachmentService.getAttachmentForDownload(session, attachmentId);
    await assertCanViewOwner(attachment.module, attachment.entityId);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(attachment.sizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) return new Response("Not found.", { status: 404 });
    if (error instanceof PermissionError) return new Response("Forbidden.", { status: 403 });
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized.", { status: 401 });
    throw error;
  }
}
