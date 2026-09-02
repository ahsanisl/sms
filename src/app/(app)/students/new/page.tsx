import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import { requireSession } from "@/lib/tenancy";
import { NewStudentClient } from "@/app/(app)/students/new/new-student-client";

export default async function NewStudentPage() {
  const session = await requireSession();
  const [campuses, classes] = await Promise.all([campusService.listCampuses(session), classService.listClasses(session)]);

  return <NewStudentClient campuses={campuses.filter((c) => c.status === "active")} classes={classes.filter((c) => c.status === "active")} />;
}
