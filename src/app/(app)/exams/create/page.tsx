import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as subjectService from "@/services/subject.service";
import { requireSession } from "@/lib/tenancy";
import { CreateExamClient } from "@/app/(app)/exams/create/create-exam-client";

export default async function CreateExamPage() {
  const session = await requireSession();
  const [campuses, classes, subjects] = await Promise.all([
    campusService.listCampuses(session),
    classService.listClasses(session),
    subjectService.listSubjects(session),
  ]);

  return (
    <CreateExamClient
      campuses={campuses.filter((c) => c.status === "active")}
      classes={classes}
      subjects={subjects}
      defaultCampusId={session.role === "campus_admin" ? (session.campusId ?? undefined) : undefined}
    />
  );
}
