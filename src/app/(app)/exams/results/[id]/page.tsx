"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Award } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExamsStore, useStudents, useSchoolProfile } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { SUBJECTS, classLabel } from "@/lib/mock/reference-data";
import { grade } from "@/lib/mock/exams";
import { formatDate } from "@/lib/format";

export default function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useSession();
  const { students } = useStudents();
  const { exams, marks } = useExamsStore();
  const { schoolProfile } = useSchoolProfile();

  const student = students.find((s) => s.id === id);
  // Parents/students only ever see published results; admins/teachers can still review unpublished marks here before publishing.
  const canSeeUnpublished = user?.role !== "parent";
  const studentExams = exams.filter(
    (e) => (canSeeUnpublished || e.resultsPublished) && marks.some((m) => m.examId === e.id && m.studentId === id),
  );
  const [examId, setExamId] = useState(studentExams[studentExams.length - 1]?.id ?? "");

  if (!student) {
    return <EmptyState icon="person_off" title="Student not found" description="Go back to Students." actionLabel="Back to Students" onAction={() => router.push("/students")} />;
  }

  const exam = exams.find((e) => e.id === (examId || studentExams[studentExams.length - 1]?.id));
  const entries = exam ? marks.filter((m) => m.examId === exam.id && m.studentId === id) : [];
  const totalObtained = entries.reduce((s, e) => s + e.obtainedMarks, 0);
  const totalMax = entries.reduce((s, e) => s + e.totalMarks, 0);
  const percentage = totalMax ? Math.round((totalObtained / totalMax) * 100) : 0;
  const overallGrade = grade(percentage);
  const passed = exam ? percentage >= exam.passingMarks : false;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <h2 className="text-headline-md font-semibold text-on-surface">Student Result</h2>
        <div className="flex items-center gap-3">
          {studentExams.length > 1 && (
            <Select value={exam?.id ?? ""} onChange={(e) => setExamId(e.target.value)}>
              {studentExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </Button>
        </div>
      </div>

      {!exam ? (
        <EmptyState icon="quiz" title="No published results" description="This student has no published exam results yet." />
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg space-y-8">
          <div className="flex items-center gap-3 pb-lg border-b border-outline-variant text-center justify-center flex-col">
            <span className="text-4xl leading-none">{schoolProfile.logoEmoji}</span>
            <div>
              <h1 className="text-headline-md font-semibold text-primary">{schoolProfile.name}</h1>
              <p className="text-label-sm text-on-surface-variant">{schoolProfile.tagline}</p>
              <p className="text-label-sm text-on-surface-variant">{schoolProfile.address}</p>
            </div>
          </div>
          {canSeeUnpublished && !exam.resultsPublished && (
            <div className="flex items-center gap-2 -mt-2 print:hidden">
              <StatusBadge label="Unpublished — not visible to the parent yet" tone="warning" />
            </div>
          )}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-lg border-b border-outline-variant">
            <div className="flex items-center gap-4">
              <Avatar name={student.name} size="lg" />
              <div>
                <h3 className="text-title-lg font-semibold text-on-surface">{student.name}</h3>
                <p className="text-body-md text-on-surface-variant">
                  {classLabel(student.classId)} · Roll {student.rollNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-body-md font-medium text-on-surface">{exam.name}</p>
              <p className="text-label-sm text-on-surface-variant">{exam.term} · {formatDate(exam.startDate)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-title-lg font-semibold text-primary mb-4">Academic Performance</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide">Subject</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Max Marks</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-right">Marks Obtained</th>
                  <th className="px-6 py-3 text-label-sm text-on-surface-variant uppercase tracking-wide text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {entries.map((entry) => {
                  const pct = Math.round((entry.obtainedMarks / entry.totalMarks) * 100);
                  return (
                    <tr key={entry.id}>
                      <td className="px-6 py-3 text-body-md text-on-surface font-medium">{SUBJECTS.find((s) => s.id === entry.subjectId)?.name}</td>
                      <td className="px-6 py-3 text-body-md text-on-surface-variant text-right">{entry.totalMarks}</td>
                      <td className="px-6 py-3 text-body-md text-on-surface text-right">{entry.obtainedMarks}</td>
                      <td className="px-6 py-3 text-center">
                        <StatusBadge label={grade(pct)} tone={pct >= 60 ? "success" : pct >= 40 ? "warning" : "error"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-title-lg font-semibold text-primary mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryTile label="Total Marks" value={`${totalObtained} / ${totalMax}`} />
              <SummaryTile label="Percentage" value={`${percentage}%`} />
              <SummaryTile label="Overall Grade" value={overallGrade} highlight />
              <SummaryTile label="Result" value={passed ? "Pass" : "Fail"} tone={passed ? "success" : "error"} />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-secondary-container/10 rounded-lg p-4 text-body-md text-on-surface-variant">
            <Award className="text-secondary shrink-0" size={20} />
            {passed
              ? "Congratulations! This student has met the passing criteria for this examination."
              : "This student did not meet the minimum passing marks for one or more subjects. Consider scheduling additional support."}
          </div>

          {schoolProfile.showSignatureLines && (
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center">
                <div className="border-t border-on-surface-variant/40 pt-2">
                  <p className="text-label-sm text-on-surface-variant">Class Teacher</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-on-surface-variant/40 pt-2">
                  <p className="text-label-sm text-on-surface-variant">Principal</p>
                </div>
              </div>
            </div>
          )}

          {schoolProfile.reportCardFooter && (
            <p className="text-label-sm text-on-surface-variant text-center pt-4 border-t border-outline-variant/40">{schoolProfile.reportCardFooter}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "success" | "error" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "error" ? "text-error" : highlight ? "text-secondary" : "text-primary";
  return (
    <div className="bg-surface-bright border border-outline-variant/50 rounded-lg p-4">
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-headline-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}
