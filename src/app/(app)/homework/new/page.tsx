import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as teacherService from "@/services/teacher.service";
import { requireSession } from "@/lib/tenancy";
import { NewHomeworkClient } from "@/app/(app)/homework/new/new-homework-client";

export default async function NewHomeworkPage() {
  const session = await requireSession();
  const [classes, subjects, teachers] = await Promise.all([
    classService.listClasses(session),
    subjectService.listSubjects(session),
    teacherService.listTeachers(session),
  ]);

  return (
    <NewHomeworkClient
      classes={classes.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: `${c.grade}-${c.section}`, subjectIds: c.subjectIds, campusId: c.campusId }))}
      subjects={subjects.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: s.name }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, campusId: t.campusId }))}
      isTeacher={session.role === "teacher"}
    />
  );
}
