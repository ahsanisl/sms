"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Pencil, Users, GraduationCap as GradIcon, ClipboardList, User as UserIcon, UserMinus, ArrowRightLeft, RotateCcw, History } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { WithdrawForm, type WithdrawFormValues } from "@/components/students/withdraw-form";
import { TransferForm, type TransferFormValues } from "@/components/students/transfer-form";
import { AttendanceHistoryCard } from "@/components/students/attendance-history-card";
import { useStudents, usePermissions } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { teacherName, campusName, classLabel, CLASSES } from "@/lib/mock/reference-data";
import { attendanceForStudent, attendanceRate } from "@/lib/mock/attendance";
import { invoicesForStudent } from "@/lib/mock/fees";
import { EXAMS, marksForStudentExam, grade } from "@/lib/mock/exams";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/mock/students";
import { formatDate, formatPKR } from "@/lib/format";
import type { StudentLifecycleEvent } from "@/lib/types";

const LIFECYCLE_LABEL: Record<StudentLifecycleEvent["type"], string> = {
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  reactivation: "Reactivation",
  promotion: "Promotion",
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const { students, updateStudent, withdrawStudent, transferStudent, reactivateStudent, lifecycleForStudent } = useStudents();
  const canManage = !!user && !!routePermissions[user.role]?.studentsManage;
  const canSeeUnpublishedResults = user?.role !== "parent";
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const student = students.find((s) => s.id === id);

  if (!student) {
    return (
      <EmptyState
        icon="person_off"
        title="Student not found"
        description="This student may have been removed. Go back to the student directory."
        actionLabel="Back to Students"
        onAction={() => router.push("/students")}
      />
    );
  }

  const cls = CLASSES.find((c) => c.id === student.classId);
  const rate = attendanceRate(attendanceForStudent(student.id));
  const history = lifecycleForStudent(student.id);
  const isActive = student.status === "active" || student.status === "inactive";

  function handleEditSubmit(values: StudentFormValues) {
    updateStudent({ ...values, id: student!.id });
    toast.success("Student profile updated.");
    setEditOpen(false);
  }

  function handleWithdraw(values: WithdrawFormValues) {
    withdrawStudent({ studentId: student!.id, ...values });
    toast.success(`${student!.name} was ${values.resultingStatus === "alumni" ? "moved to Alumni" : "withdrawn"}.`);
    setWithdrawOpen(false);
  }

  function handleTransfer(values: TransferFormValues) {
    transferStudent({ studentId: student!.id, ...values });
    toast.success(`${student!.name} was transferred to ${classLabel(values.toClassId)}, ${campusName(values.toCampusId)}.`);
    setTransferOpen(false);
  }

  function handleReactivate() {
    reactivateStudent({ studentId: student!.id, date: new Date().toISOString().slice(0, 10), reason: "Reactivated by admin" });
    toast.success(`${student!.name} was reactivated.`);
    setReactivateOpen(false);
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
            <p className="text-on-surface-variant text-body-md">{cls ? `${cls.grade} — Section ${cls.section}` : "Unassigned"}</p>
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
              <InfoRow label="Nationality" value="Pakistani" />
              <InfoRow label="Address" value={student.address} span2 />
            </InfoCard>

            <InfoCard icon={<GradIcon size={18} />} title="Academic Information">
              <InfoRow label="Current Grade" value={cls?.grade ?? "—"} />
              <InfoRow label="Section" value={cls?.section ?? "—"} />
              <InfoRow label="Class Teacher" value={cls ? teacherName(cls.classTeacherId) : "—"} />
              <InfoRow label="Attendance Rate" value={`${rate}%`} valueClassName="text-green-700 font-semibold" />
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
          <AttendanceHistoryCard studentId={student.id} />
        </TabsContent>

        <TabsContent value="fees">
          <FeesTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="exams">
          <ExamsTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant/40 flex items-center gap-2">
              <History size={18} className="text-secondary" />
              <p className="text-title-lg font-semibold text-primary">Lifecycle History</p>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {history.map((e) => (
                <div key={e.id} className="px-lg py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-body-md font-medium text-on-surface">{LIFECYCLE_LABEL[e.type]}</span>
                    <span className="text-label-sm text-on-surface-variant">{formatDate(e.date)}</span>
                  </div>
                  {e.type === "transfer" && (
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      {classLabel(e.fromClassId ?? "")}, {campusName(e.fromCampusId ?? "")} → {classLabel(e.toClassId ?? "")}, {campusName(e.toCampusId ?? "")}
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
                      {e.resultingStatus === "alumni" ? (
                        <>{classLabel(e.fromClassId ?? "")} → Graduated to Alumni</>
                      ) : (
                        <>{classLabel(e.fromClassId ?? "")} → {classLabel(e.toClassId ?? "")}</>
                      )}
                    </p>
                  )}
                  {e.reason && <p className="text-body-md text-on-surface mt-2">{e.reason}</p>}
                </div>
              ))}
              {history.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No lifecycle events recorded yet.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Student" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <StudentForm initialValues={student} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal open={withdrawOpen} onOpenChange={setWithdrawOpen} title="Withdraw / Graduate Student" className="max-w-[32rem]">
        <WithdrawForm studentName={student.name} onSubmit={handleWithdraw} onCancel={() => setWithdrawOpen(false)} />
      </Modal>

      <Modal open={transferOpen} onOpenChange={setTransferOpen} title="Transfer Student" className="max-w-[32rem]">
        <TransferForm student={student} onSubmit={handleTransfer} onCancel={() => setTransferOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivate this student?"
        description={`${student.name} will be moved back to Active and reappear on active rosters, attendance and fee collection.`}
        confirmLabel="Reactivate"
        onConfirm={handleReactivate}
      />
    </div>
  );

  function FeesTab({ studentId }: { studentId: string }) {
    const invoices = invoicesForStudent(studentId);
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-lg border-b border-outline-variant/40 flex items-center justify-between">
          <p className="text-title-lg font-semibold text-primary">Fee Invoices</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/students/${studentId}/ledger`}>View Ledger</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/fees/collect?studentId=${studentId}`}>Collect Payment</Link>
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
        </div>
      </div>
    );
  }

  function ExamsTab({ studentId }: { studentId: string }) {
    const completed = EXAMS.filter(
      (e) => e.status === "completed" && (canSeeUnpublishedResults || e.resultsPublished) && marksForStudentExam(studentId, e.id).length > 0,
    );
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-lg border-b border-outline-variant/40">
          <p className="text-title-lg font-semibold text-primary">Examination Results</p>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {completed.map((exam) => {
            const entries = marksForStudentExam(studentId, exam.id);
            const total = entries.reduce((s, e) => s + e.obtainedMarks, 0);
            const outOf = entries.reduce((s, e) => s + e.totalMarks, 0);
            const pct = outOf ? Math.round((total / outOf) * 100) : 0;
            return (
              <div key={exam.id} className="flex items-center justify-between px-lg py-4">
                <div>
                  <p className="text-body-md font-medium text-on-surface">{exam.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{exam.term}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-body-md text-on-surface font-medium">
                    {total}/{outOf} ({pct}%)
                  </span>
                  <StatusBadge label={grade(pct)} tone={pct >= 60 ? "success" : pct >= 40 ? "warning" : "error"} />
                  <Link href={`/exams/results/${studentId}`} className="text-label-md text-secondary hover:underline">
                    View Result Card
                  </Link>
                </div>
              </div>
            );
          })}
          {completed.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No results published yet.</p>}
        </div>
      </div>
    );
  }
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
