import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
// Deliberately NOT importing `db` from "@/db" — that module is guarded with
// `import "server-only"`, which unconditionally throws outside Next's own
// "react-server" module resolution (i.e. always, under plain tsx). The seed
// script needs its own bare connection for exactly that reason; application
// code should still always go through @/db, never this pattern.
import * as schema from "@/db/schema";
import {
  academicSessions,
  campuses,
  classes,
  classSubjects,
  feeCategories,
  gradeBands,
  parentChildren,
  periods,
  rolePermissions,
  rooms,
  schools,
  students,
  subjects,
  teacherSubjects,
  teachers,
  terms,
  timetableConfigs,
  users,
} from "@/db/schema";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import type { PermissionModule, Role } from "@/lib/types";

/**
 * Realistic, bounded dev fixtures — not a line-for-line translation of the
 * frontend's lib/mock/*.ts generators (which produce ~110 students across 3
 * campuses via seeded-random generation keyed by string ids like "main").
 * Translating that generator faithfully into real inserted rows would need
 * an id-remapping layer disproportionate to what a dev seed needs; this
 * script instead hand-seeds a small, real, relationally-correct dataset
 * covering every Phase-1 domain, sized for manual testing rather than demo
 * scale. See the final summary for this tradeoff.
 *
 * DEV-ONLY PASSWORDS — every seeded account uses "Password123!". Never reuse
 * this seed against a real deployment's database.
 */
const DEV_PASSWORD = "Password123!";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

async function main() {
  console.log("Seeding...");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // -- Role permissions (mirrors the frontend's DEFAULT_ROLE_PERMISSIONS) --------------------------------------------------------
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as Role[];
  const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
  const permissionRows = roles.flatMap((role) => modules.map((module) => ({ role, module, allowed: DEFAULT_ROLE_PERMISSIONS[role][module] })));
  await db.insert(rolePermissions).values(permissionRows).onConflictDoNothing();

  // -- School --------------------------------------------------------
  const [school] = await db
    .insert(schools)
    .values({
      name: "EduFlow Academy",
      tagline: "Excellence in Education Since 2005",
      address: "Shahrah-e-Faisal, Karachi, Pakistan",
      phone: "+92 21 3456 7890",
      email: "info@eduflow.edu.pk",
      logoEmoji: "🎓",
      reportCardFooter: "This is a computer-generated report card and does not require a signature.",
      showSignatureLines: true,
      status: "active",
      onboardingComplete: true,
    })
    .returning();

  // -- Campuses --------------------------------------------------------
  const [mainCampus] = await db
    .insert(campuses)
    .values({ schoolId: school.id, name: "Main Campus", city: "Karachi", address: "Shahrah-e-Faisal, Karachi", phone: "+92 21 3456 7890", email: "main@eduflow.edu.pk" })
    .returning();
  const [cliftonCampus] = await db
    .insert(campuses)
    .values({ schoolId: school.id, name: "Clifton Campus", city: "Karachi", address: "Block 5, Clifton, Karachi", phone: "+92 21 3456 1234", email: "clifton@eduflow.edu.pk" })
    .returning();

  // -- Subjects --------------------------------------------------------
  const subjectSeed = [
    { name: "English", code: "ENG" },
    { name: "Urdu", code: "URD" },
    { name: "Mathematics", code: "MATH" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SST" },
    { name: "Islamiyat", code: "ISL" },
    { name: "Computer Science", code: "CS" },
  ];
  const insertedSubjects = await db
    .insert(subjects)
    .values(subjectSeed.map((s) => ({ ...s, schoolId: school.id })))
    .returning();
  const subjectByCode = new Map(insertedSubjects.map((s) => [s.code, s]));
  const coreSubjectIds = ["ENG", "URD", "MATH", "SCI"].map((code) => subjectByCode.get(code)!.id);

  // -- Teachers --------------------------------------------------------
  const teacherSeed = [
    { name: "Ayesha Khan", employeeId: "EDU-T0001", campusId: mainCampus.id, phone: "+92 300 1112222", subjectCode: "ENG" },
    { name: "Bilal Ahmed", employeeId: "EDU-T0002", campusId: mainCampus.id, phone: "+92 300 1112223", subjectCode: "MATH" },
    { name: "Sana Malik", employeeId: "EDU-T0003", campusId: cliftonCampus.id, phone: "+92 300 1112224", subjectCode: "SCI" },
  ];
  const insertedTeachers = [];
  for (const t of teacherSeed) {
    const [teacher] = await db
      .insert(teachers)
      .values({ name: t.name, employeeId: t.employeeId, campusId: t.campusId, phone: t.phone, email: `${t.employeeId.toLowerCase()}@eduflow.edu.pk`, qualification: "M.Ed", status: "active" })
      .returning();
    await db.insert(teacherSubjects).values({ teacherId: teacher.id, subjectId: subjectByCode.get(t.subjectCode)!.id });
    insertedTeachers.push(teacher);
  }

  // -- Classes --------------------------------------------------------
  const classSeed = [
    { grade: "Grade 1", section: "A", campusId: mainCampus.id, classTeacherId: insertedTeachers[0].id },
    { grade: "Grade 5", section: "A", campusId: mainCampus.id, classTeacherId: insertedTeachers[1].id },
    { grade: "Grade 1", section: "A", campusId: cliftonCampus.id, classTeacherId: insertedTeachers[2].id },
  ];
  const insertedClasses = [];
  for (const c of classSeed) {
    const [cls] = await db.insert(classes).values({ ...c, studentCapacity: 35, status: "active" }).returning();
    await db.insert(classSubjects).values(coreSubjectIds.map((subjectId) => ({ classId: cls.id, subjectId })));
    insertedClasses.push(cls);
  }

  // -- Rooms --------------------------------------------------------
  await db.insert(rooms).values([
    { campusId: mainCampus.id, name: "Room 101", type: "classroom", capacity: 35 },
    { campusId: mainCampus.id, name: "Room 102", type: "classroom", capacity: 35 },
    { campusId: mainCampus.id, name: "Science Lab", type: "lab", capacity: 30 },
    { campusId: mainCampus.id, name: "Main Hall", type: "hall", capacity: 200 },
    { campusId: cliftonCampus.id, name: "Room 201", type: "classroom", capacity: 30 },
    { campusId: cliftonCampus.id, name: "Computer Lab", type: "lab", capacity: 25 },
  ]);

  // -- Students --------------------------------------------------------
  const studentSeed = [
    { name: "Ahmed Raza", classId: insertedClasses[0].id, campusId: mainCampus.id, gender: "male" as const, parentName: "Mr. Raza Ahmed" },
    { name: "Fatima Noor", classId: insertedClasses[0].id, campusId: mainCampus.id, gender: "female" as const, parentName: "Mrs. Noor Fatima" },
    { name: "Hassan Ali", classId: insertedClasses[1].id, campusId: mainCampus.id, gender: "male" as const, parentName: "Mr. Ali Hassan" },
    { name: "Zainab Tariq", classId: insertedClasses[2].id, campusId: cliftonCampus.id, gender: "female" as const, parentName: "Mr. Tariq Zainab" },
  ];
  const insertedStudents = [];
  for (const [i, s] of studentSeed.entries()) {
    const [student] = await db
      .insert(students)
      .values({
        name: s.name,
        rollNumber: `${i + 1}`.padStart(2, "0"),
        admissionNo: `EDU-2026-${1000 + i}`,
        classId: s.classId,
        campusId: s.campusId,
        gender: s.gender,
        dob: "2016-04-12",
        bloodGroup: "O+",
        parentName: s.parentName,
        parentPhone: "+92 300 555" + (1000 + i),
        parentEmail: `parent${i + 1}@example.com`,
        address: "Karachi, Pakistan",
        admissionDate: "2024-08-01",
        status: "active",
      })
      .returning();
    insertedStudents.push(student);
  }

  // -- Users (one per role, dev password for all) --------------------------------------------------------
  const insertedUsers = await db
    .insert(users)
    .values([
      { role: "platform_admin", name: "Platform Admin", email: "platform@eduflow.dev", passwordHash, avatarSeed: "Platform Admin" },
      { schoolId: school.id, role: "school_owner", name: "Bilal Farooqi", email: "owner@eduflow.dev", passwordHash, avatarSeed: "Bilal Farooqi" },
      { schoolId: school.id, role: "school_admin", name: "Ahsan Raza", email: "admin@eduflow.dev", passwordHash, avatarSeed: "Ahsan Raza" },
      { schoolId: school.id, campusId: cliftonCampus.id, role: "campus_admin", name: "Mahnoor Sheikh", email: "campus.admin@eduflow.dev", passwordHash, avatarSeed: "Mahnoor Sheikh" },
      { schoolId: school.id, role: "accountant", name: "Sana Malik", email: "accountant@eduflow.dev", passwordHash, avatarSeed: "Sana Malik" },
      { schoolId: school.id, campusId: mainCampus.id, teacherId: insertedTeachers[0].id, role: "teacher", name: insertedTeachers[0].name, email: "teacher@eduflow.dev", passwordHash, avatarSeed: insertedTeachers[0].name },
      { schoolId: school.id, campusId: mainCampus.id, role: "parent", name: studentSeed[0].parentName, email: "parent@eduflow.dev", passwordHash, avatarSeed: studentSeed[0].parentName },
    ])
    .returning();

  // parent@eduflow.dev is Ahmed Raza's (studentSeed[0]) parent — link them so the
  // Parent portal (once reconnected to Postgres) has a real child to resolve.
  const parentUser = insertedUsers.find((u) => u.role === "parent")!;
  await db.insert(parentChildren).values({ parentUserId: parentUser.id, studentId: insertedStudents[0].id });

  // -- Academic session --------------------------------------------------------
  const [session] = await db
    .insert(academicSessions)
    .values({ schoolId: school.id, label: "2026 – 2027", startDate: "2026-08-01", endDate: "2027-06-30", isActive: true })
    .returning();
  await db.insert(terms).values([
    { sessionId: session.id, name: "Term 1", startDate: "2026-08-01", endDate: "2026-12-18" },
    { sessionId: session.id, name: "Term 2", startDate: "2026-12-08", endDate: "2027-06-30" },
  ]);

  // -- Fee categories --------------------------------------------------------
  await db.insert(feeCategories).values(
    ["Tuition Fee", "Admission Fee", "Examination Fee", "Annual Fund"].map((name) => ({ schoolId: school.id, name, status: "active" as const })),
  );

  // -- Grade scale --------------------------------------------------------
  await db.insert(gradeBands).values(
    [
      { grade: "A+", minPercentage: 90 },
      { grade: "A", minPercentage: 80 },
      { grade: "B", minPercentage: 70 },
      { grade: "C", minPercentage: 60 },
      { grade: "D", minPercentage: 50 },
      { grade: "E", minPercentage: 40 },
      { grade: "F", minPercentage: 0 },
    ].map((b) => ({ ...b, schoolId: school.id })),
  );

  // -- Timetable config --------------------------------------------------------
  await db.insert(timetableConfigs).values({ schoolId: school.id, workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], breakAfterPeriod: 3 });
  await db.insert(periods).values(
    [
      { period: 1, startTime: "08:00", endTime: "08:40" },
      { period: 2, startTime: "08:40", endTime: "09:20" },
      { period: 3, startTime: "09:20", endTime: "10:00" },
      { period: 4, startTime: "10:20", endTime: "11:00" },
    ].map((p) => ({ ...p, schoolId: school.id })),
  );

  console.log("Seed complete.");
  console.log("\nDev login credentials (password for every account):", DEV_PASSWORD);
  console.log("  platform@eduflow.dev       — Platform Admin");
  console.log("  owner@eduflow.dev          — School Owner");
  console.log("  admin@eduflow.dev          — School Admin");
  console.log("  campus.admin@eduflow.dev   — Campus Admin (Clifton)");
  console.log("  accountant@eduflow.dev     — Accountant");
  console.log("  teacher@eduflow.dev        — Teacher");
  console.log("  parent@eduflow.dev         — Parent");
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await sql.end();
    process.exit(1);
  });
