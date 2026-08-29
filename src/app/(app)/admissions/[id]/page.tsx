"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, GraduationCap, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { useAdmissions } from "@/lib/store/hooks";
import { CLASSES, campusName } from "@/lib/mock/reference-data";
import { INQUIRY_STAGE_LABEL, INQUIRY_STAGE_ORDER, INQUIRY_STAGE_TONE } from "@/lib/mock/admissions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { inquiries, updateInquiry, updateInquiryStage, convertInquiryToStudent } = useAdmissions();
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [admitOpen, setAdmitOpen] = useState(false);

  const inquiry = inquiries.find((i) => i.id === id);

  if (!inquiry) {
    return (
      <EmptyState icon="how_to_reg" title="Inquiry not found" description="Go back to Admissions." actionLabel="Back to Admissions" onAction={() => router.push("/admissions")} />
    );
  }

  const isTerminal = inquiry.stage === "admitted" || inquiry.stage === "rejected";
  const currentIndex = INQUIRY_STAGE_ORDER.indexOf(inquiry.stage);
  const nextStage = !isTerminal && currentIndex >= 0 && currentIndex < INQUIRY_STAGE_ORDER.length - 1 ? INQUIRY_STAGE_ORDER[currentIndex + 1] : null;

  function handleAdvance() {
    if (!nextStage) return;
    updateInquiryStage(inquiry!.id, nextStage);
    toast.success(`Moved to ${INQUIRY_STAGE_LABEL[nextStage]}.`);
  }

  function handleReject() {
    updateInquiry({ ...inquiry!, stage: "rejected", notes: rejectNote || inquiry!.notes });
    toast.success("Inquiry marked as rejected.");
    setRejecting(false);
    setRejectNote("");
  }

  function handleAdmit(values: StudentFormValues) {
    convertInquiryToStudent(inquiry!.id, values);
    toast.success(`${values.name} was admitted and added to the student roster.`);
    setAdmitOpen(false);
    router.push("/admissions");
  }

  const matchingClass = CLASSES.find((c) => c.status === "active" && c.campusId === inquiry.campusId && c.grade === inquiry.gradeAppliedFor);
  const fallbackClass = CLASSES.find((c) => c.status === "active" && c.campusId === inquiry.campusId) ?? CLASSES[0];

  const studentSeed: Student = {
    id: "temp",
    name: inquiry.childName,
    rollNumber: "",
    admissionNo: "",
    classId: matchingClass?.id ?? fallbackClass?.id ?? "",
    campusId: inquiry.campusId,
    gender: "male",
    dob: "",
    bloodGroup: "O+",
    parentName: inquiry.parentName,
    parentPhone: inquiry.parentPhone,
    parentEmail: inquiry.parentEmail,
    address: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={inquiry.childName}
        description={`${inquiry.gradeAppliedFor} · ${campusName(inquiry.campusId)}`}
        actions={<StatusBadge label={INQUIRY_STAGE_LABEL[inquiry.stage]} tone={INQUIRY_STAGE_TONE[inquiry.stage]} />}
      />

      {!isTerminal && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm mb-6">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-4">Pipeline Progress</p>
          <div className="flex items-center mb-6">
            {INQUIRY_STAGE_ORDER.map((stage, i) => (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
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
                    {INQUIRY_STAGE_LABEL[stage]}
                  </span>
                </div>
                {i < INQUIRY_STAGE_ORDER.length - 1 && <div className={cn("h-0.5 flex-1 mx-2", i < currentIndex ? "bg-secondary" : "bg-outline-variant")} />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {inquiry.stage === "offered" ? (
              <Button onClick={() => setAdmitOpen(true)}>
                <GraduationCap size={16} /> Admit &amp; Create Student Record
              </Button>
            ) : (
              nextStage && (
                <Button onClick={handleAdvance}>
                  <Check size={16} /> Advance to {INQUIRY_STAGE_LABEL[nextStage]}
                </Button>
              )
            )}
            <Button variant="secondary" onClick={() => setRejecting(true)}>
              <X size={16} /> Reject
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-title-lg font-semibold text-on-surface mb-4">Parent / Guardian</h3>
          <div className="space-y-3">
            <p className="text-body-md text-on-surface font-medium">{inquiry.parentName}</p>
            <p className="text-body-md text-on-surface-variant flex items-center gap-2"><Phone size={16} /> {inquiry.parentPhone}</p>
            {inquiry.parentEmail && <p className="text-body-md text-on-surface-variant flex items-center gap-2"><Mail size={16} /> {inquiry.parentEmail}</p>}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-title-lg font-semibold text-on-surface mb-4">Inquiry Details</h3>
          <div className="space-y-2 text-body-md">
            <div className="flex justify-between"><span className="text-on-surface-variant">Source</span><span className="text-on-surface">{inquiry.source}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Logged</span><span className="text-on-surface">{formatDate(inquiry.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Last Update</span><span className="text-on-surface">{formatDate(inquiry.updatedAt)}</span></div>
          </div>
        </div>

        {inquiry.notes && (
          <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-2">Notes</h3>
            <p className="text-body-md text-on-surface-variant">{inquiry.notes}</p>
          </div>
        )}
      </div>

      <Modal open={rejecting} onOpenChange={setRejecting} title="Reject Inquiry" className="max-w-[28rem]">
        <div className="space-y-4">
          <FormField label="Reason (optional)" htmlFor="rejectNote">
            <Textarea id="rejectNote" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g., No seats available in the requested grade" />
          </FormField>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
            <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Inquiry</Button>
          </div>
        </div>
      </Modal>

      <Modal open={admitOpen} onOpenChange={setAdmitOpen} title="Admit & Create Student Record" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <p className="text-body-md text-on-surface-variant mb-4">
          Review and complete the enrollment details below — this creates a full student record and marks the inquiry Admitted.
        </p>
        <StudentForm initialValues={studentSeed} submitLabel="Admit Student" onSubmit={handleAdmit} onCancel={() => setAdmitOpen(false)} />
      </Modal>
    </div>
  );
}
