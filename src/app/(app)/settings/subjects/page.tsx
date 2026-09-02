import * as subjectService from "@/services/subject.service";
import * as classService from "@/services/class.service";
import { requireSession } from "@/lib/tenancy";
import { SubjectsClient } from "@/app/(app)/settings/subjects/subjects-client";

export default async function SubjectManagementPage() {
  const session = await requireSession();
  const [subjects, classes] = await Promise.all([subjectService.listSubjects(session), classService.listClasses(session)]);

  const subjectsWithCount = subjects.map((subject) => ({
    ...subject,
    classCount: classes.filter((c) => c.subjectIds.includes(subject.id) && c.status === "active").length,
  }));

  return <SubjectsClient subjects={subjectsWithCount} />;
}
