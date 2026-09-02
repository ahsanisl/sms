import { redirect } from "next/navigation";
import * as schoolService from "@/services/school.service";
import * as campusService from "@/services/campus.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as sessionService from "@/services/academic-session.service";
import * as examService from "@/services/exam.service";
import * as timetableService from "@/services/timetable.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { OnboardingWizardClient } from "@/app/(onboarding)/onboarding/onboarding-wizard-client";
import type { TimetableDay } from "@/lib/types";

export default async function OnboardingWizardPage() {
  const session = await requireSession();
  if (session.role !== "school_owner") redirect("/dashboard");

  const school = await schoolService.getMySchool(session);
  if (school.onboardingComplete) redirect("/dashboard");

  const [campuses, subjects, rawTeachers, classes, rawStudents, sessions, gradeBands, timetableConfig, feeCategories] = await Promise.all([
    campusService.listCampuses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
    classService.listClasses(session),
    studentService.listStudents(session),
    sessionService.listSessions(session),
    examService.listGradeBands(session),
    timetableService.getConfig(session),
    feeService.listCategories(session),
  ]);

  // classIds/dob/admissionDate: same nullable-DB-field-vs-mock-required-field
  // fixups already used on the real /teachers and /students pages.
  const teachers = rawTeachers.map((t) => ({
    ...t,
    joinDate: t.joinDate ?? "",
    classIds: classes.filter((c) => c.classTeacherId === t.id && c.status === "active").map((c) => c.id),
  }));
  const students = rawStudents.map((s) => ({ ...s, dob: s.dob ?? "", admissionDate: s.admissionDate ?? "" }));

  return (
    <OnboardingWizardClient
      schoolName={school.name}
      campuses={campuses}
      subjects={subjects}
      teachers={teachers}
      classes={classes}
      students={students}
      sessions={sessions}
      gradeBands={gradeBands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))}
      timetableWorkingDays={timetableConfig.workingDays as TimetableDay[]}
      timetablePeriods={timetableConfig.periods.map((p) => ({ period: p.period, startTime: p.startTime, endTime: p.endTime }))}
      timetableBreakAfterPeriod={timetableConfig.breakAfterPeriod}
      feeCategories={feeCategories}
    />
  );
}
