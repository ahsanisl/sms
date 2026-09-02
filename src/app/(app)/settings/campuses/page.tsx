import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as teacherService from "@/services/teacher.service";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";
import { CampusManagementClient } from "@/app/(app)/settings/campuses/campus-management-client";

export default async function CampusManagementPage() {
  const session = await requireSession();
  const [campuses, classes, teachers, students] = await Promise.all([
    campusService.listCampuses(session),
    classService.listClasses(session),
    teacherService.listTeachers(session),
    studentService.listStudents(session),
  ]);

  const campusesWithStats = campuses.map((campus) => ({
    ...campus,
    stats: {
      classes: classes.filter((c) => c.campusId === campus.id && c.status === "active").length,
      students: students.filter((s) => s.campusId === campus.id && s.status === "active").length,
      teachers: teachers.filter((t) => t.campusId === campus.id && t.status === "active").length,
    },
  }));

  return <CampusManagementClient campuses={campusesWithStats} />;
}
