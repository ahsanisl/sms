import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as subjectService from "@/services/subject.service";
import { requireSession } from "@/lib/tenancy";
import { TeachersClient } from "@/app/(app)/teachers/teachers-client";

export default async function TeachersPage() {
  const session = await requireSession();
  const [teachers, classes, campuses, subjects] = await Promise.all([
    teacherService.listTeachers(session),
    classService.listClasses(session),
    campusService.listCampuses(session),
    subjectService.listSubjects(session),
  ]);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const rows = teachers.map((t) => {
    const classIds = classes.filter((c) => c.classTeacherId === t.id && c.status === "active").map((c) => c.id);
    return {
      ...t,
      joinDate: t.joinDate ?? "",
      classIds,
      subjectNames: t.subjectIds.map((sid) => subjectById.get(sid)?.name).filter(Boolean).join(", "),
      classLabels: classIds.map((cid) => classes.find((c) => c.id === cid)).filter((c): c is NonNullable<typeof c> => !!c).map((c) => `${c.grade}-${c.section}`).join(", "),
    };
  });

  return <TeachersClient teachers={rows} campuses={campuses.filter((c) => c.status === "active")} subjects={subjects.filter((s) => s.status === "active")} />;
}
