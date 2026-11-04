import * as syllabusService from "@/services/syllabus.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import * as sessionService from "@/services/academic-session.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { SyllabusClient } from "@/app/(app)/syllabus/syllabus-client";
import { activeSession } from "@/lib/academic-session";

export default async function SyllabusPage({ searchParams }: { searchParams: Promise<{ classId?: string; subjectId?: string }> }) {
  const { classId: requestedClassId, subjectId: requestedSubjectId } = await searchParams;
  const session = await requireSession();

  const [classes, subjects, sessions, canManage] = await Promise.all([
    classService.listClasses(session),
    subjectService.listSubjects(session),
    sessionService.listSessions(session),
    can(session, "syllabusManage"),
  ]);

  const activeClasses = classes.filter((c) => c.status === "active");
  const classId = requestedClassId && activeClasses.some((c) => c.id === requestedClassId) ? requestedClassId : (activeClasses[0]?.id ?? "");
  const cls = activeClasses.find((c) => c.id === classId);

  const subjectOptions = (cls?.subjectIds ?? [])
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const subjectId = requestedSubjectId && subjectOptions.some((s) => s.id === requestedSubjectId) ? requestedSubjectId : (subjectOptions[0]?.id ?? "");

  const currentSession = activeSession(sessions);
  const topics = classId && subjectId && currentSession ? await syllabusService.listTopics(session, classId, subjectId, currentSession.id) : [];

  return (
    <SyllabusClient
      key={`${classId}-${subjectId}`}
      classOptions={activeClasses.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      classId={classId}
      subjectOptions={subjectOptions.map((s) => ({ id: s.id, name: s.name }))}
      subjectId={subjectId}
      academicSessionId={currentSession?.id ?? ""}
      sessionLabel={currentSession?.label ?? "No active academic session"}
      topics={topics.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        plannedStartDate: t.plannedStartDate ?? "",
        plannedEndDate: t.plannedEndDate ?? "",
        status: t.status,
        completedDate: t.completedDate ?? "",
      }))}
      canManage={canManage}
      isTeacher={session.role === "teacher"}
    />
  );
}
