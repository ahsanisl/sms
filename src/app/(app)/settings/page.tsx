import * as schoolService from "@/services/school.service";
import * as campusService from "@/services/campus.service";
import * as sessionService from "@/services/academic-session.service";
import * as subjectService from "@/services/subject.service";
import * as examService from "@/services/exam.service";
import * as departmentService from "@/services/department.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { SettingsClient } from "@/app/(app)/settings/settings-client";
import { activeSession } from "@/lib/mock/sessions";

export default async function SettingsPage() {
  const session = await requireSession();
  const [school, campuses, sessions, subjects, gradeBands, departments, canCampuses, canTimetable, canFees, canUsers] = await Promise.all([
    schoolService.getMySchool(session),
    campusService.listCampuses(session),
    sessionService.listSessions(session),
    subjectService.listSubjects(session),
    examService.listGradeBands(session),
    departmentService.listDepartments(session),
    can(session.role, "settingsCampuses"),
    can(session.role, "timetableBuilder"),
    can(session.role, "feesStructure"),
    can(session.role, "settingsUsers"),
  ]);

  return (
    <SettingsClient
      school={{
        name: school.name,
        tagline: school.tagline,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logoEmoji: school.logoEmoji,
        reportCardFooter: school.reportCardFooter,
        showSignatureLines: school.showSignatureLines,
      }}
      visibility={{ settingsCampuses: canCampuses, timetableBuilder: canTimetable, feesStructure: canFees, settingsUsers: canUsers }}
      activeCampuses={campuses.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))}
      currentSession={(() => {
        const s = activeSession(sessions);
        return s ? { label: s.label, startDate: s.startDate, endDate: s.endDate } : undefined;
      })()}
      activeSubjects={subjects.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name }))}
      gradeBands={[...gradeBands].sort((a, b) => b.minPercentage - a.minPercentage).map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))}
      activeDepartmentCount={departments.filter((d) => d.status === "active").length}
    />
  );
}
