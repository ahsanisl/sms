"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HomeworkForm } from "@/components/homework/homework-form";
import { updateHomeworkAction, deleteHomeworkAction, gradeSubmissionAction } from "@/app/(app)/homework/actions";
import { formatDate, timeAgo } from "@/lib/format";

type SubmissionStatus = "not_submitted" | "submitted" | "graded";
const STATUS_LABEL: Record<SubmissionStatus, string> = { not_submitted: "Not Submitted", submitted: "Submitted", graded: "Graded" };
const STATUS_TONE: Record<SubmissionStatus, "neutral" | "warning" | "success"> = { not_submitted: "neutral", submitted: "warning", graded: "success" };

interface SubmissionRow {
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: SubmissionStatus;
  submissionText: string;
  submittedAt: string;
  grade: string;
  teacherComment: string;
  submissionId: string | null;
}

interface HomeworkDetail {
  id: string;
  title: string;
  description: string;
  classLabel: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
}

export function HomeworkDetailClient({
  homework,
  attachments,
  canManage,
  isTeacher,
  classes,
  subjects,
  teachers,
  submissions,
  submissionAttachments,
}: {
  homework: HomeworkDetail;
  attachments: { id: string; fileName: string; sizeBytes: number }[];
  canManage: boolean;
  isTeacher: boolean;
  classes: { id: string; label: string; subjectIds: string[]; campusId: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string; campusId: string }[];
  submissions: SubmissionRow[];
  submissionAttachments: Record<string, { id: string; fileName: string }[]>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [grading, setGrading] = useState<SubmissionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEdit(formData: FormData) {
    setSubmitting(true);
    const result = await updateHomeworkAction(homework.id, formData);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Homework updated.");
    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    const result = await deleteHomeworkAction(homework.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Homework removed.");
    router.push("/homework");
  }

  return (
    <div>
      <PageHeader
        title={homework.title}
        description={`${homework.classLabel} · ${homework.subjectName} · ${homework.teacherName}`}
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil size={16} /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-3">Description</h3>
          <p className="text-body-md text-on-surface whitespace-pre-wrap">{homework.description || "No description provided."}</p>

          {attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-outline-variant/40">
              <h4 className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Attachments</h4>
              <div className="space-y-2">
                {attachments.map((a) => (
                  <a key={a.id} href={`/api/files/${a.id}`} className="flex items-center gap-2 text-body-md text-secondary hover:underline">
                    <Download size={16} /> {a.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-3">Details</h3>
          <dl className="space-y-3 text-body-md">
            <div>
              <dt className="text-label-sm text-on-surface-variant uppercase">Assigned</dt>
              <dd className="text-on-surface">{formatDate(homework.assignedDate)}</dd>
            </div>
            <div>
              <dt className="text-label-sm text-on-surface-variant uppercase">Due</dt>
              <dd className="text-on-surface">{formatDate(homework.dueDate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {canManage && (
        <div className="bg-surface border border-outline-variant rounded-xl card-shadow overflow-hidden">
          <div className="p-lg border-b border-outline-variant/40">
            <h3 className="text-title-lg font-semibold text-primary">Submissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="p-3 pl-lg font-semibold text-label-sm text-on-surface-variant uppercase">Student</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Roll No.</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Status</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Submitted</th>
                  <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">Grade</th>
                  <th className="p-3 pr-lg font-semibold text-label-sm text-on-surface-variant uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {submissions.map((s) => (
                  <tr key={s.studentId} className="hover:bg-surface-bright transition-colors">
                    <td className="p-3 pl-lg font-medium text-on-surface">{s.studentName}</td>
                    <td className="p-3 text-on-surface-variant">{s.rollNumber}</td>
                    <td className="p-3"><StatusBadge label={STATUS_LABEL[s.status]} tone={STATUS_TONE[s.status]} /></td>
                    <td className="p-3 text-on-surface-variant">{s.submittedAt ? timeAgo(s.submittedAt) : "—"}</td>
                    <td className="p-3 text-on-surface-variant">{s.grade || "—"}</td>
                    <td className="p-3 pr-lg text-right">
                      {s.submissionId ? (
                        <button className="text-label-md text-secondary hover:underline" onClick={() => setGrading(s)}>
                          {s.status === "graded" ? "View / Regrade" : "Review & Grade"}
                        </button>
                      ) : (
                        <span className="text-label-sm text-on-surface-variant">Not submitted</span>
                      )}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-body-md text-on-surface-variant">No active students in this class.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Homework" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <HomeworkForm
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          isTeacher={isTeacher}
          initialValues={{
            classId: homework.classId,
            subjectId: homework.subjectId,
            teacherId: homework.teacherId,
            title: homework.title,
            description: homework.description,
            assignedDate: homework.assignedDate,
            dueDate: homework.dueDate,
            attachmentName: attachments[0]?.fileName,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this homework?"
        description={`"${homework.title}" and every student submission for it will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <Modal open={!!grading} onOpenChange={(open) => !open && setGrading(null)} title={grading ? `Grade — ${grading.studentName}` : ""} className="max-w-[32rem]">
        {grading && (
          <GradeSubmissionForm
            submission={grading}
            attachments={grading.submissionId ? (submissionAttachments[grading.submissionId] ?? []) : []}
            onClose={() => setGrading(null)}
            onGraded={() => {
              setGrading(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function GradeSubmissionForm({
  submission,
  attachments,
  onClose,
  onGraded,
}: {
  submission: SubmissionRow;
  attachments: { id: string; fileName: string }[];
  onClose: () => void;
  onGraded: () => void;
}) {
  const [grade, setGrade] = useState(submission.grade);
  const [comment, setComment] = useState(submission.teacherComment);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!submission.submissionId) return;
    if (!grade.trim()) {
      toast.error("Enter a grade.");
      return;
    }
    setSaving(true);
    const result = await gradeSubmissionAction(submission.submissionId, grade, comment);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Grade saved.");
    onGraded();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Submitted Text</p>
        <p className="text-body-md text-on-surface whitespace-pre-wrap bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
          {submission.submissionText || "No text submitted."}
        </p>
      </div>
      {attachments.length > 0 && (
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Attachments</p>
          <div className="space-y-1">
            {attachments.map((a) => (
              <a key={a.id} href={`/api/files/${a.id}`} className="block text-body-md text-secondary hover:underline">
                {a.fileName}
              </a>
            ))}
          </div>
        </div>
      )}
      <FormField label="Grade" htmlFor="grade" required>
        <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., 18/20 or A" />
      </FormField>
      <FormField label="Comment (optional)" htmlFor="comment">
        <Textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Feedback for the student…" />
      </FormField>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Grade"}
        </Button>
      </div>
    </div>
  );
}
