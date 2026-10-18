"use client";

import { useState } from "react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitHomeworkAction } from "@/app/(app)/portal/homework/actions";
import { formatDate } from "@/lib/format";

type SubmissionStatus = "not_submitted" | "submitted" | "graded";
const STATUS_LABEL: Record<SubmissionStatus, string> = { not_submitted: "Not Submitted", submitted: "Submitted", graded: "Graded" };
const STATUS_TONE: Record<SubmissionStatus, "neutral" | "warning" | "success"> = { not_submitted: "neutral", submitted: "warning", graded: "success" };

interface SubmissionDetail {
  status: SubmissionStatus;
  submissionText: string;
  submittedAt: string;
  grade: string;
  teacherComment: string;
  attachments: { id: string; fileName: string }[];
}

export function ParentHomeworkDetailClient({
  homeworkId,
  studentId,
  title,
  description,
  classLabel,
  subjectName,
  teacherName,
  assignedDate,
  dueDate,
  attachments,
  submission,
}: {
  homeworkId: string;
  studentId: string;
  title: string;
  description: string;
  classLabel: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  attachments: { id: string; fileName: string }[];
  submission: SubmissionDetail | null;
}) {
  const router = useLoadingRouter();
  const [submissionText, setSubmissionText] = useState(submission?.submissionText ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    const formData = new FormData();
    formData.set("submissionText", submissionText);
    if (file) formData.set("file", file);
    setSubmitting(true);
    const result = await submitHomeworkAction(homeworkId, studentId, formData);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(submission ? "Your submission was updated." : "Homework submitted.");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title={title} description={`${classLabel} · ${subjectName} · ${teacherName}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
            <h3 className="text-title-lg font-semibold text-primary mb-3">Description</h3>
            <p className="text-body-md text-on-surface whitespace-pre-wrap">{description || "No description provided."}</p>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-lg font-semibold text-primary">{submission ? "Your Submission" : "Submit Homework"}</h3>
              {submission && <StatusBadge label={STATUS_LABEL[submission.status]} tone={STATUS_TONE[submission.status]} />}
            </div>

            {submission?.status === "graded" && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-body-md font-semibold text-emerald-700">Grade: {submission.grade}</p>
                {submission.teacherComment && <p className="text-body-md text-emerald-700 mt-1">{submission.teacherComment}</p>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Your Answer" htmlFor="submissionText">
                <Textarea id="submissionText" rows={5} value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Type the answer here…" />
              </FormField>
              <FormField label="Attachment (optional)" htmlFor="file" hint="PDF, image, or Office document, up to 15MB.">
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </FormField>
              {submission && submission.attachments.length > 0 && (
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Currently submitted files</p>
                  {submission.attachments.map((a) => (
                    <a key={a.id} href={`/api/files/${a.id}`} className="block text-body-md text-secondary hover:underline">
                      {a.fileName}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : submission ? "Update Submission" : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow h-fit">
          <h3 className="text-title-lg font-semibold text-primary mb-3">Details</h3>
          <dl className="space-y-3 text-body-md">
            <div>
              <dt className="text-label-sm text-on-surface-variant uppercase">Assigned</dt>
              <dd className="text-on-surface">{formatDate(assignedDate)}</dd>
            </div>
            <div>
              <dt className="text-label-sm text-on-surface-variant uppercase">Due</dt>
              <dd className="text-on-surface">{formatDate(dueDate)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
