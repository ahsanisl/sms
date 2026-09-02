"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Pencil, Users, GraduationCap as GradIcon, ClipboardList, User as UserIcon, UserMinus, ArrowRightLeft, RotateCcw, History } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { WithdrawForm, type WithdrawFormValues } from "@/components/students/withdraw-form";
import { TransferForm, type TransferFormValues } from "@/components/students/transfer-form";
import { RequestCorrectionForm, type RequestCorrectionValues } from "@/components/attendance/request-correction-form";
import {
  updateStudentAction,
  withdrawStudentAction,
  transferStudentAction,
  reactivateStudentAction,
  requestAttendanceCorrectionAction,
} from "@/app/(app)/students/[id]/actions";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/mock/students";
import { gradeFor } from "@/lib/grade";
import { formatDate, formatPKR } from "@/lib/format";
import type { AttendanceStatus, Campus, ClassSection, InvoiceStatus, Student, StudentLifecycleEventType, StudentStatus } from "@/lib/types";

const LIFECYCLE_LABEL: Record<StudentLifecycleEventType, string> = {
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  reactivation: "Reactivation",
  promotion: "Promotion",
};

interface AttendanceRow {
  id: string;
  date: string;
  status: AttendanceStatus;
  classId: string;
}

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  month: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
}

interface ExamRow {
  id: string;
  name: string;
  term: string;
  obtained: number;
  outOf: number;
  percentage: number;
}

interface LifecycleRow {
  id: string;
  type: StudentLifecycleEventType;
  date: string;
  reason: string | null;
  resultingStatus: StudentStatus | null;
  fromClassLabel: string;
  toClassLabel: string;
  fromCampusName: string;
  toCampusName: string;
  leavingCertificateIssued: boolean;
}

export function StudentDetailClient({
  student,
  classGrade,
  classSection,
  classTeacherName,
  attendanceRate,
  attendanceRecords,
  invoices,
  examSummary,
  lifecycleEvents,
  campuses,
  classes,
  gradeBands,
  canManage,
  canRequestCorrection,
}: {
  student: Student;
  classGrade: string;
  classSection: string;
  classTeacherName: string;
  attendanceRate: number;
  attendanceRecords: AttendanceRow[];
  invoices: InvoiceRow[];
  examSummary: ExamRow[];
  lifecycleEvents: LifecycleRow[];
  campuses: Campus[];
  classes: ClassSection[];
  gradeBands: { grade: string; minPercentage: number }[];
  canManage: boolean;
  canRequestCorrection: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [correcting, setCorrecting] = useState<AttendanceRow | null>(null);
  const [busy, setBusy] = useState(false);

  const isActive = student.status === "active" || student.status === "inactive";

  async function handleEditSubmit(values: StudentFormValues) {
    const result = await updateStudentAction(student.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Student profile updated.");
    setEditOpen(false);
    router.refresh();
  }

  async function handleWithdraw(values: WithdrawFormValues) {
    const result = await withdrawStudentAction(student.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${student.name} was ${values.resultingStatus === "alumni" ? "moved to Alumni" : "withdrawn"}.`);
    setWithdrawOpen(false);
    router.refresh();
  }

  async function handleTransfer(values: TransferFormValues) {
    const result = await transferStudentAction(student.id, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${student.name} was transferred.`);
    setTransferOpen(false);
    router.refresh();
  }

  async function handleReactivate() {
    setBusy(true);
    const result = await reactivateStudentAction(student.id, new Date().toISOString().slice(0, 10), "Reactivated by admin");
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${student.name} was reactivated.`);
    setReactivateOpen(false);
    router.refresh();
  }

  async function handleRequestCorrection(values: RequestCorrectionValues) {
    if (!correcting) return;
    const result = await requestAttendanceCorrectionAction({
      studentId: student.id,
      classId: correcting.classId,
      date: correcting.date,
      currentStatus: correcting.status,
      requestedStatus: values.requestedStatus,
      reason: values.reason,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Correction request submitted for approval.");
    setCorrecting(null);
  }

  return (
    <div>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row md:flex-wrap items-start md:items-center justify-between gap-6 mb-6 shadow-sm">
        <div className="flex items-center gap-6">
          <Avatar name={student.name} size="lg" className="h-24 w-24 text-2xl" />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-headline-lg font-semibold text-on-surface">{student.name}</h2>
              <span className="bg-surface-container text-primary px-2 py-1 rounded-full text-label-sm border border-secondary-fixed">
                {student.admissionNo}
              </span>
              <StatusBadge label={STUDENT_STATUS_LABEL[student.status]} tone={studentStatusTone(student.status)} />
            </div>
            <p className="text-on-surface-variant text-body-md">{classGrade !== "—" ? `${classGrade} — Section ${classSection}` : "Unassigned"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print Profile
          </Button>
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil size={18} /> Edit Student
              </Button>
              {isActive ? (
                <>
                  <Button variant="secondary" onClick={() => setTransferOpen(true)}>
                    <ArrowRightLeft size={18} /> Transfer
                  </Button>
                  <Button variant="destructive" onClick={() => setWithdrawOpen(true)}>
                    <UserMinus size={18} /> Withdraw
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setReactivateOpen(true)}>
                  <RotateCcw size={18} /> Reactivate
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <InfoCard icon={<UserIcon size={18} />} title="Personal Information">
              <InfoRow label="Date of Birth" value={formatDate(student.dob)} />
              <InfoRow label="Gender" value={student.gender === "male" ? "Male" : "Female"} />
              <InfoRow label="Blood Group" value={student.bloodGroup} />
              <InfoRow label="Address" value={student.address} span2 />
            </InfoCard>

            <InfoCard icon={<GradIcon size={18} />} title="Academic Information">
              <InfoRow label="Current Grade" value={classGrade} />
              <InfoRow label="Section" value={classSection} />
              <InfoRow label="Class Teacher" value={classTeacherName} />
              <InfoRow label="Attendance Rate" value={`${attendanceRate}%`} valueClassName="text-green-700 font-semibold" />
            </InfoCard>

            <InfoCard icon={<Users size={18} />} title="Parent Information">
              <InfoRow label="Parent/Guardian" value={student.parentName} />
              <InfoRow label="Phone" value={student.parentPhone} />
              <InfoRow label="Email" value={student.parentEmail} span2 />
            </InfoCard>

            <InfoCard icon={<ClipboardList size={18} />} title="Admission Information">
              <InfoRow label="Admission Date" value={formatDate(student.admissionDate)} />
              <InfoRow label="Admission No." value={student.admissionNo} />
              <InfoRow label="Roll Number" value={student.rollNumber} />
              <InfoRow label="Status" value={STUDENT_STATUS_LABEL[student.status]} />
            </InfoCard>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg flex items-center justify-between border-b border-outline-variant/40">
              <p className="text-title-lg font-semibold text-primary">Attendance History</p>
              <p className="text-headline-md font-semibold text-emerald-600">{attendanceRate}%</p>
            </div>
            <div className="divide-y divide-outline-variant/20 max-h-96 overflow-y-auto">
              {[...attendanceRecords].reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between px-lg py-3">
                  <span className="text-body-md text-on-surface">{formatDate(r.date)}</span>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      label={r.status[0].toUpperCase() + r.status.slice(1)}
                      tone={r.status === "present" ? "success" : r.status === "late" ? "warning" : r.status === "leave" ? "info" : "error"}
                    />
                    {canRequestCorrection && (
                      <button
                        className="text-label-sm text-secondary hover:underline flex items-center gap-1"
                        onClick={() => setCorrecting(r)}
                        title="Request Correction"
                      >
                        <History size={14} /> Correct
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {attendanceRecords.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No attendance recorded yet.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant/40 flex items-center justify-between">
              <p className="text-title-lg font-semibold text-primary">Fee Invoices</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/students/${student.id}/ledger`}>View Ledger</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/fees/collect?studentId=${student.id}`}>Collect Payment</Link>
                </Button>
              </div>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-lg py-4">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{inv.month}</p>
                    <p className="text-label-sm text-on-surface-variant">{inv.invoiceNo}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-body-md text-on-surface font-medium">{formatPKR(inv.totalAmount)}</span>
                    <StatusBadge
                      label={inv.status[0].toUpperCase() + inv.status.slice(1)}
                      tone={inv.status === "paid" ? "success" : inv.status === "partial" ? "warning" : "error"}
                    />
                    <Link href={`/fees/invoices/${inv.id}`} className="text-label-md text-secondary hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No invoices yet.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exams">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant/40">
              <p className="text-title-lg font-semibold text-primary">Examination Results</p>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {examSummary.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between px-lg py-4">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{exam.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{exam.term}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-body-md text-on-surface font-medium">
                      {exam.obtained}/{exam.outOf} ({exam.percentage}%)
                    </span>
                    <StatusBadge label={gradeFor(exam.percentage, gradeBands)} tone={exam.percentage >= 60 ? "success" : exam.percentage >= 40 ? "warning" : "error"} />
                    <Link href={`/exams/results/${student.id}`} className="text-label-md text-secondary hover:underline">
                      View Result Card
                    </Link>
                  </div>
                </div>
              ))}
              {examSummary.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No results published yet.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant/40 flex items-center gap-2">
              <History size={18} className="text-secondary" />
              <p className="text-title-lg font-semibold text-primary">Lifecycle History</p>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {lifecycleEvents.map((e) => (
                <div key={e.id} className="px-lg py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-body-md font-medium text-on-surface">{LIFECYCLE_LABEL[e.type]}</span>
                    <span className="text-label-sm text-on-surface-variant">{formatDate(e.date)}</span>
                  </div>
                  {e.type === "transfer" && (
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      {e.fromClassLabel}, {e.fromCampusName} → {e.toClassLabel}, {e.toCampusName}
                    </p>
                  )}
                  {e.type === "withdrawal" && (
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      Moved to {STUDENT_STATUS_LABEL[e.resultingStatus ?? "withdrawn"]}
                      {e.leavingCertificateIssued ? " · Leaving certificate issued" : ""}
                    </p>
                  )}
                  {e.type === "promotion" && (
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      {e.resultingStatus === "alumni" ? <>{e.fromClassLabel} → Graduated to Alumni</> : <>{e.fromClassLabel} → {e.toClassLabel}</>}
                    </p>
                  )}
                  {e.reason && <p className="text-body-md text-on-surface mt-2">{e.reason}</p>}
                </div>
              ))}
              {lifecycleEvents.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No lifecycle events recorded yet.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Student" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <StudentForm initialValues={student} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} campuses={campuses} classes={classes} />
      </Modal>

      <Modal open={withdrawOpen} onOpenChange={setWithdrawOpen} title="Withdraw / Graduate Student" className="max-w-[32rem]">
        <WithdrawForm studentName={student.name} onSubmit={handleWithdraw} onCancel={() => setWithdrawOpen(false)} />
      </Modal>

      <Modal open={transferOpen} onOpenChange={setTransferOpen} title="Transfer Student" className="max-w-[32rem]">
        <TransferForm student={student} onSubmit={handleTransfer} onCancel={() => setTransferOpen(false)} campuses={campuses} classes={classes} />
      </Modal>

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivate this student?"
        description={`${student.name} will be moved back to Active and reappear on active rosters, attendance and fee collection.`}
        confirmLabel={busy ? "Reactivating…" : "Reactivate"}
        onConfirm={handleReactivate}
      />

      <Modal open={!!correcting} onOpenChange={(open) => !open && setCorrecting(null)} title="Request Attendance Correction" className="max-w-[28rem]">
        {correcting && <RequestCorrectionForm currentStatus={correcting.status} onSubmit={handleRequestCorrection} onCancel={() => setCorrecting(null)} />}
      </Modal>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
      <h3 className="text-title-lg font-semibold text-on-surface mb-4 border-b border-outline-variant pb-2 flex items-center gap-2">
        <span className="text-secondary">{icon}</span>
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-y-4 gap-x-6">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, span2, valueClassName }: { label: string; value: string; span2?: boolean; valueClassName?: string }) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <p className="text-label-sm text-on-surface-variant mb-1">{label}</p>
      <p className={`text-body-md text-on-surface ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}
