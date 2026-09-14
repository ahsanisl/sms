import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as sessionService from "@/services/academic-session.service";
import * as curriculumService from "@/services/curriculum.service";
import { requireSession } from "@/lib/tenancy";
import { ParentCurriculumClient } from "@/app/(app)/portal/curriculum/curriculum-client";
import { activeSession } from "@/lib/mock/sessions";

export default async function ParentCurriculumPage() {
  const session = await requireSession();
  const [children, classes, subjects, sessions] = await Promise.all([
    studentService.listMyChildren(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
    sessionService.listSessions(session),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const currentSession = activeSession(sessions);

  const childRows = await Promise.all(
    children.map(async (child) => {
      const cls = classById.get(child.classId);
      const classSubjects = (cls?.subjectIds ?? []).map((id) => subjectById.get(id)).filter((s): s is NonNullable<typeof s> => !!s);

      const bySubject = currentSession
        ? await Promise.all(
            classSubjects.map(async (subject) => {
              const topics = await curriculumService.listTopicsForParent(session, child.classId, subject.id, currentSession.id);
              const completed = topics.filter((t) => t.status === "completed").length;
              return {
                subjectId: subject.id,
                subjectName: subject.name,
                topics: topics.map((t) => ({ id: t.id, title: t.title, status: t.status })),
                progressPct: topics.length ? Math.round((completed / topics.length) * 100) : 0,
              };
            }),
          )
        : [];

      return {
        id: child.id,
        name: child.name,
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        subjects: bySubject,
      };
    }),
  );

  return <ParentCurriculumClient childRows={childRows} sessionLabel={currentSession?.label ?? "No active academic session"} />;
}
