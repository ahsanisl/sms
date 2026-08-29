import type { AppUser } from "@/lib/types";
import { TEACHERS } from "@/lib/mock/reference-data";
import { STUDENTS } from "@/lib/mock/students";

const demoTeacher = TEACHERS[0];
const demoParentChildren = STUDENTS.filter((s) => s.status === "active").slice(0, 2);

/** Fixed demo accounts for the mock login screen — no real authentication. */
export const DEMO_USERS: AppUser[] = [
  {
    id: "u-school-owner",
    name: "Bilal Farooqi",
    role: "school_owner",
    email: "owner@eduflow.pk",
    avatarSeed: "Bilal Farooqi",
  },
  {
    id: "u-school-admin",
    name: "Ahsan Raza",
    role: "school_admin",
    email: "admin@eduflow.pk",
    avatarSeed: "Ahsan Raza",
  },
  {
    id: "u-campus-admin",
    name: "Mahnoor Sheikh",
    role: "campus_admin",
    email: "campus.admin@eduflow.pk",
    campusId: "clifton",
    avatarSeed: "Mahnoor Sheikh",
  },
  {
    id: "u-accountant",
    name: "Sana Malik",
    role: "accountant",
    email: "accounts@eduflow.pk",
    avatarSeed: "Sana Malik",
  },
  {
    // Reuses the teacher's own record id so session-linked lookups
    // (My Classes, timetable) resolve correctly against TEACHERS/TIMETABLE.
    id: demoTeacher.id,
    name: demoTeacher.name,
    role: "teacher",
    email: demoTeacher.email,
    campusId: demoTeacher.campusId,
    avatarSeed: demoTeacher.name,
  },
  {
    id: "u-parent",
    name: demoParentChildren[0] ? `${demoParentChildren[0].parentName}` : "Muhammad Khan",
    role: "parent",
    email: "parent@eduflow.pk",
    campusId: demoParentChildren[0]?.campusId,
    avatarSeed: demoParentChildren[0]?.parentName ?? "Muhammad Khan",
    childStudentIds: demoParentChildren.map((s) => s.id),
  },
];

export function findDemoUser(email: string): AppUser | undefined {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
