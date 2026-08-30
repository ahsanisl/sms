import type { AppUser } from "@/lib/types";
import { CAMPUSES, TEACHERS } from "@/lib/mock/reference-data";
import { STUDENTS } from "@/lib/mock/students";

const demoTeacher = TEACHERS[0];
const demoParentChildren = STUDENTS.filter((s) => s.status === "active").slice(0, 2);

function schoolIdForCampus(campusId: string | undefined): string | undefined {
  return campusId ? CAMPUSES.find((c) => c.id === campusId)?.schoolId : undefined;
}

/** Fixed demo accounts for the mock login screen — no real authentication. */
export const DEMO_USERS: AppUser[] = [
  {
    id: "u-school-owner",
    name: "Bilal Farooqi",
    role: "school_owner",
    email: "owner@eduflow.pk",
    schoolId: "school-eduflow",
    avatarSeed: "Bilal Farooqi",
  },
  {
    id: "u-school-owner-horizon",
    name: "Ayesha Malik",
    role: "school_owner",
    email: "owner@horizon.pk",
    schoolId: "school-horizon",
    avatarSeed: "Ayesha Malik",
  },
  {
    id: "u-school-admin",
    name: "Ahsan Raza",
    role: "school_admin",
    email: "admin@eduflow.pk",
    schoolId: "school-eduflow",
    avatarSeed: "Ahsan Raza",
  },
  {
    id: "u-campus-admin",
    name: "Mahnoor Sheikh",
    role: "campus_admin",
    email: "campus.admin@eduflow.pk",
    schoolId: "school-eduflow",
    campusId: "clifton",
    avatarSeed: "Mahnoor Sheikh",
  },
  {
    id: "u-accountant",
    name: "Sana Malik",
    role: "accountant",
    email: "accounts@eduflow.pk",
    schoolId: "school-eduflow",
    avatarSeed: "Sana Malik",
  },
  {
    // Reuses the teacher's own record id so session-linked lookups
    // (My Classes, timetable) resolve correctly against TEACHERS/TIMETABLE.
    id: demoTeacher.id,
    name: demoTeacher.name,
    role: "teacher",
    email: demoTeacher.email,
    schoolId: schoolIdForCampus(demoTeacher.campusId),
    campusId: demoTeacher.campusId,
    avatarSeed: demoTeacher.name,
  },
  {
    id: "u-parent",
    name: demoParentChildren[0] ? `${demoParentChildren[0].parentName}` : "Muhammad Khan",
    role: "parent",
    email: "parent@eduflow.pk",
    schoolId: schoolIdForCampus(demoParentChildren[0]?.campusId),
    campusId: demoParentChildren[0]?.campusId,
    avatarSeed: demoParentChildren[0]?.parentName ?? "Muhammad Khan",
    childStudentIds: demoParentChildren.map((s) => s.id),
  },
  {
    id: "u-platform-admin",
    name: "Fahad Qureshi",
    role: "platform_admin",
    email: "platform@eduflow.pk",
    avatarSeed: "Fahad Qureshi",
  },
];
