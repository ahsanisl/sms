"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, GraduationCap, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { advanceInquiryStageAction, rejectInquiryAction, admitInquiryAction } from "@/app/(app)/admissions/[id]/actions";
import { INQUIRY_STAGE_LABEL, INQUIRY_STAGE_ORDER, INQUIRY_STAGE_TONE } from "@/lib/mock/admissions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Campus, ClassSection, InquiryStage, Student } from "@/lib/types";

export function InquiryDetailClient({
  inquiryId,
  childName,
  gradeAppliedFor,
  campusName,
  parentName,
  parentPhone,
  parentEmail,
  source,
  notes,
  createdAt,
  updatedAt,
  stage,
  studentSeed,
  campuses,
  classes,
}: {
  inquiryId: string;
  childName: string;
  gradeAppliedFor: string;
  campusName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stage: InquiryStage;
  studentSeed: Student;
  campuses: Campus[];
  classes: ClassSection[];
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [admitOpen, setAdmitOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTerminal = stage === "admitted" || stage === "rejected";
  const currentIndex = INQUIRY_STAGE_ORDER.indexOf(stage);
  const nextStage = !isTerminal && currentIndex >= 0 && currentIndex < INQUIRY_STAGE_ORDER.length - 1 ? INQUIRY_STAGE_ORDER[currentIndex + 1] : null;

  async function handleAdvance() {
    if (!nextStage) return;
    setBusy(true);
    const result = await advanceInquiryStageAction(inquiryId, nextStage);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Moved to ${INQUIRY_STAGE_LABEL[nextStage]}.`);
    router.refresh();
  }

  async function handleReject() {
    setBusy(true);
    const result = await rejectInquiryAction(inquiryId, rejectNote || undefined);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Inquiry marked as rejected.");
    setRejecting(false);
    setRejectNote("");
    router.refresh();
  }

  async function handleAdmit(values: StudentFormValues) {
    const result = await admitInquiryAction(inquiryId, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was admitted and added to the student roster.`);
    setAdmitOpen(false);
    router.push("/admissions");
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={childName}
        description={`${gradeAppliedFor} · ${campusName}`}
        actions={<StatusBadge label={INQUIRY_STAGE_LABEL[stage]} tone={INQUIRY_STAGE_TONE[stage]} />}
      />

      {!isTerminal && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm mb-6">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-4">Pipeline Progress</p>
          <div className="flex items-center mb-6">
            {INQUIRY_STAGE_ORDER.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-label-md font-semibold shrink-0",
                      i < currentIndex ? "bg-secondary text-white" : i === currentIndex ? "bg-secondary text-white ring-4 ring-secondary/20" : "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    {i < currentIndex ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={cn("text-label-sm whitespace-nowrap", i === currentIndex ? "text-on-surface font-semibold" : "text-on-surface-variant")}>
                    {INQUIRY_STAGE_LABEL[s]}
                  </span>
                </div>
                {i < INQUIRY_STAGE_ORDER.length - 1 && <div className={cn("h-0.5 flex-1 mx-2", i < currentIndex ? "bg-secondary" : "bg-outline-variant")} />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {stage === "offered" ? (
              <Button onClick={() => setAdmitOpen(true)}>
                <GraduationCap size={16} /> Admit &amp; Create Student Record
              </Button>
            ) : (
              nextStage && (
                <Button onClick={handleAdvance} disabled={busy}>
                  <Check size={16} /> Advance to {INQUIRY_STAGE_LABEL[nextStage]}
                </Button>
              )
            )}
            <Button variant="secondary" onClick={() => setRejecting(true)} disabled={busy}>
              <X size={16} /> Reject
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-title-lg font-semibold text-on-surface mb-4">Parent / Guardian</h3>
          <div className="space-y-3">
            <p className="text-body-md text-on-surface font-medium">{parentName}</p>
            <p className="text-body-md text-on-surface-variant flex items-center gap-2"><Phone size={16} /> {parentPhone}</p>
            {parentEmail && <p className="text-body-md text-on-surface-variant flex items-center gap-2"><Mail size={16} /> {parentEmail}</p>}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-title-lg font-semibold text-on-surface mb-4">Inquiry Details</h3>
          <div className="space-y-2 text-body-md">
            <div className="flex justify-between"><span className="text-on-surface-variant">Source</span><span className="text-on-surface">{source}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Logged</span><span className="text-on-surface">{formatDate(createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Last Update</span><span className="text-on-surface">{formatDate(updatedAt)}</span></div>
          </div>
        </div>

        {notes && (
          <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-2">Notes</h3>
            <p className="text-body-md text-on-surface-variant">{notes}</p>
          </div>
        )}
      </div>

      <Modal open={rejecting} onOpenChange={setRejecting} title="Reject Inquiry" className="max-w-[28rem]">
        <div className="space-y-4">
          <FormField label="Reason (optional)" htmlFor="rejectNote">
            <Textarea id="rejectNote" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g., No seats available in the requested grade" />
          </FormField>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy}>Reject Inquiry</Button>
          </div>
        </div>
      </Modal>

      <Modal open={admitOpen} onOpenChange={setAdmitOpen} title="Admit & Create Student Record" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <p className="text-body-md text-on-surface-variant mb-4">
          Review and complete the enrollment details below — this creates a full student record and marks the inquiry Admitted.
        </p>
        <StudentForm initialValues={studentSeed} submitLabel="Admit Student" onSubmit={handleAdmit} onCancel={() => setAdmitOpen(false)} campuses={campuses} classes={classes} />
      </Modal>
    </div>
  );
}
