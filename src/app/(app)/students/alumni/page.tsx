import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { AlumniClient } from "@/app/(app)/students/alumni/alumni-client";

export default async function AlumniDirectoryPage() {
  const session = await requireSession();
  const [students, classes, campuses, canManage] = await Promise.all([
    studentService.listStudents(session),
    classService.listClasses(session),
    campusService.listCampuses(session),
    can(session.role, "studentsManage"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const alumniStudents = students.filter((s) => s.status === "alumni");

  const alumni = await Promise.all(
    alumniStudents.map(async (s) => {
      const events = await studentService.listLifecycleEvents(session, s.id);
      const graduationEvents = events.filter((e) => e.resultingStatus === "alumni").sort((a, b) => (a.date < b.date ? 1 : -1));
      const cls = classById.get(s.classId);
      return {
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        campusName: campusById.get(s.campusId)?.name ?? "—",
        graduatedOn: graduationEvents[0]?.date ?? null,
      };
    }),
  );

  const activeCampuses = campuses.filter((c) => c.status === "active");
  const campusCounts = activeCampuses.map((c) => ({ id: c.id, name: c.name, count: alumniStudents.filter((s) => s.campusId === c.id).length }));
  const isAllCampuses = campuses.length > 1 && session.role !== "campus_admin";

  return (
    <AlumniClient
      alumni={alumni}
      campusCounts={campusCounts}
      isAllCampuses={isAllCampuses}
      canManage={canManage}
      description={isAllCampuses ? "Former students who have graduated, kept separate from the active roster." : "Former students who have graduated from this campus."}
    />
  );
}
