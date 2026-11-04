import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
// Deliberately NOT importing `db` from "@/db" — that module is guarded with
// `import "server-only"`, which unconditionally throws outside Next's own
// "react-server" module resolution (i.e. always, under plain tsx). The seed
// script needs its own bare connection for exactly that reason; application
// code should still always go through @/db, never this pattern.
import * as schema from "@/db/schema";
import {
  academicSessions,
  announcements,
  attendanceCorrections,
  attendanceRecords,
  campuses,
  classes,
  classSubjects,
  classwork,
  syllabusTopics,
  departments,
  departmentSubjects,
  examClasses,
  exams,
  examSubjects,
  feeCategories,
  feeConcessions,
  feeInvoiceItems,
  feeInvoices,
  feePaymentReversals,
  feePayments,
  feeStructureItems,
  gradeBands,
  homework,
  homeworkSubmissions,
  inquiries,
  marksEntries,
  parentChildren,
  periods,
  schoolRoles,
  schoolRolePermissions,
  rooms,
  schools,
  staffLeaveRequests,
  studentLifecycleEvents,
  students,
  subjects,
  teacherSubjects,
  teachers,
  terms,
  timetableConfigs,
  timetableSlots,
  timetableStatus,
  users,
} from "@/db/schema";
import { SCHOOL_ROLE_MODULES, systemRoleRows } from "@/lib/school-roles";
import type { PermissionModule, Role } from "@/lib/types";

/**
 * Demo/testing dataset: one school, three campuses, ~100 students, and real
 * activity behind every screen — weeks of attendance, a few months of fee
 * invoices/payments, exams with marks, a published timetable, homework,
 * classwork, syllabus, admissions, leave, and announcements.
 *
 * Deterministic: every random choice comes from a fixed-seed RNG, so two runs
 * produce the same data. Dates are anchored to the day the script runs (not
 * hardcoded), so "today's attendance" / "this month's fees" on the
 * dashboards always have something to show.
 *
 *   npm run db:seed     — seeds an EMPTY database; refuses if data exists
 *   npm run db:reset    — empties EVERY table, then seeds (dev only!)
 *
 * DEV-ONLY PASSWORDS — every seeded account uses "Password123!". Never run
 * this against a real deployment's database.
 */
const DEV_PASSWORD = "Password123!";
const RESET = process.argv.includes("--reset");

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

// -- Deterministic randomness --------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const chance = (p: number) => rand() < p;

// -- Dates (UTC calendar days, matching the app's `toISOString().slice(0, 10)`) --------------------------------------------------------
const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const TODAY = new Date(`${iso(new Date())}T00:00:00Z`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const daysAgo = (n: number) => addDays(TODAY, -n);
const isWeekday = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY_CODES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Last `count` school days (Mon–Fri) up to and including today, never before `notBefore`. Oldest first. */
function recentSchoolDays(count: number, notBefore: Date): Date[] {
  const days: Date[] = [];
  for (let d = TODAY; days.length < count && d >= notBefore; d = addDays(d, -1)) {
    if (isWeekday(d)) days.unshift(d);
  }
  return days;
}

/** Inserts in chunks — one huge multi-row INSERT can exceed Postgres' parameter limit. */
async function insertChunked<T extends PgTable>(table: T, rows: T["$inferInsert"][], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size));
  }
}

// -- Reference data --------------------------------------------------------
const MALE_NAMES = ["Ahmed", "Ali", "Hassan", "Hamza", "Usman", "Zain", "Saad", "Faizan", "Rayyan", "Ibrahim", "Musa", "Haris", "Daniyal", "Arham", "Shayan", "Talha", "Umar", "Abdullah", "Moiz", "Fahad"];
const FEMALE_NAMES = ["Fatima", "Ayesha", "Zainab", "Maryam", "Hira", "Aliza", "Hania", "Anaya", "Eman", "Areeba", "Iqra", "Noor", "Laiba", "Zoya", "Mehwish", "Khadija", "Amna", "Rida", "Alishba", "Dua"];
const FATHER_NAMES = ["Tariq", "Imran", "Kamran", "Asif", "Naveed", "Shahid", "Faisal", "Adnan", "Waqas", "Junaid", "Rashid", "Salman", "Nadeem", "Khalid", "Javed"];
const SURNAMES = ["Khan", "Ahmed", "Malik", "Qureshi", "Siddiqui", "Sheikh", "Hussain", "Chaudhry", "Butt", "Mirza", "Abbasi", "Baig", "Javed", "Iqbal", "Shah", "Rana", "Hashmi", "Ansari", "Akhtar", "Memon"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+"];
const PREVIOUS_SCHOOLS = ["The City School", "Beaconhouse School System", "Karachi Grammar School", "Lyceum School", "The Educators", "Roots International"];
const MEDICAL_NOTES = [
  "Asthma — carries an inhaler; avoid strenuous outdoor activity on high-pollen days.",
  "Allergic to peanuts and tree nuts. Parents have provided an EpiPen kept at the front office.",
  "Wears glasses for distance — seat near the board.",
  "Type 1 diabetes — may need a snack or a glucose check during class.",
];

/**
 * Optional profile fields (identity, health, extra contacts) for the i-th
 * seeded student. Derived from the index rather than rand() so adding these
 * fields doesn't shift the random sequence every later section of the seed
 * (attendance, fees, marks) depends on.
 */
function studentExtras(i: number, studentName: string) {
  // The family name the child carries (e.g. "Ahmed Raza", whose father is "Mr. Raza Ahmed", is a Raza).
  const surname = studentName.trim().split(/\s+/).pop() ?? "";
  const phone = (offset: number) => `+92 3${(i + offset) % 5}${(i * 3 + offset) % 10} ${String(1000000 + ((i * 7919 + offset * 104729) % 9000000)).slice(0, 7)}`;
  return {
    bFormNumber: `42101-${String(1000000 + ((i * 48271) % 9000000)).slice(0, 7)}-${(i % 9) + 1}`,
    nationality: "Pakistani",
    previousSchool: i % 4 === 0 ? PREVIOUS_SCHOOLS[i % PREVIOUS_SCHOOLS.length] : "",
    medicalNotes: i % 7 === 3 ? MEDICAL_NOTES[i % MEDICAL_NOTES.length] : "",
    parentRelation: "Father",
    secondaryGuardianName: `${FEMALE_NAMES[(i * 7) % FEMALE_NAMES.length]} ${surname}`,
    secondaryGuardianRelation: "Mother",
    secondaryGuardianPhone: phone(1),
    emergencyContactName: `${FATHER_NAMES[(i + 3) % FATHER_NAMES.length]} ${surname}`,
    emergencyContactRelation: i % 3 === 0 ? "Grandfather" : "Uncle",
    emergencyContactPhone: phone(2),
  };
}

const SUBJECTS = [
  { name: "English", code: "ENG" },
  { name: "Urdu", code: "URD" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SST" },
  { name: "Islamiyat", code: "ISL" },
  { name: "Computer Science", code: "CS" },
] as const;

/** Grades match lib/constants.ts's GRADE_ORDER, so the class form and Promotion's "next grade" logic line up with seeded classes. */
const GRADE_SUBJECTS: Record<string, string[]> = {
  "Grade 1": ["ENG", "URD", "MATH", "SCI", "ISL"],
  "Grade 2": ["ENG", "URD", "MATH", "SCI", "ISL"],
  "Grade 5": ["ENG", "URD", "MATH", "SCI", "SST", "ISL", "CS"],
  "Grade 8": ["ENG", "URD", "MATH", "SCI", "SST", "ISL", "CS"],
  "O-Level": ["ENG", "URD", "MATH", "SCI", "SST", "ISL", "CS"],
};
const GRADE_AGE: Record<string, number> = { "Grade 1": 6, "Grade 2": 7, "Grade 5": 10, "Grade 8": 13, "O-Level": 15 };
const GRADE_TUITION: Record<string, number> = { "Grade 1": 8000, "Grade 2": 8500, "Grade 5": 10000, "Grade 8": 12000, "O-Level": 15000 };

const TOPICS: Record<string, string[]> = {
  ENG: ["Reading Comprehension", "Nouns and Pronouns", "Verbs and Tenses", "Creative Writing", "Poetry Appreciation"],
  URD: ["Urdu Alphabet Review", "Short Stories (Kahaniyan)", "Grammar: Ism aur Fail", "Essay Writing (Mazmoon)", "Poems (Nazmein)"],
  MATH: ["Number Sense", "Addition and Subtraction", "Multiplication and Division", "Fractions", "Geometry Basics"],
  SCI: ["Living Things", "Plants and Photosynthesis", "States of Matter", "Forms of Energy", "Earth and Space"],
  SST: ["Our Community", "Maps and Directions", "Provinces of Pakistan", "History of the Subcontinent", "Civic Responsibilities"],
  ISL: ["Pillars of Islam", "Seerat-un-Nabi", "Stories of the Prophets", "Islamic Manners (Adaab)", "Quranic Verses"],
  CS: ["Parts of a Computer", "Using a Keyboard and Mouse", "Introduction to Word Processing", "Internet Safety", "Introduction to Scratch"],
};

const PERIODS = [
  { period: 1, startTime: "08:00", endTime: "08:40" },
  { period: 2, startTime: "08:40", endTime: "09:20" },
  { period: 3, startTime: "09:20", endTime: "10:00" },
  { period: 4, startTime: "10:20", endTime: "11:00" },
  { period: 5, startTime: "11:00", endTime: "11:40" },
  { period: 6, startTime: "11:40", endTime: "12:20" },
];
const WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

// -- Reset / guard --------------------------------------------------------
async function prepareDatabase() {
  if (RESET) {
    const tableNames = (Object.values(schema) as unknown[])
      .filter((value): value is PgTable => is(value, PgTable))
      .map((table) => `"${getTableName(table)}"`);
    await sql.unsafe(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`);
    console.log(`Reset: emptied ${tableNames.length} tables.`);
    return;
  }
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.error("The database already has data, so the seed was not run (it would create duplicates).");
    console.error("To wipe EVERY table and reseed the demo data, run:  npm run db:reset");
    await sql.end();
    process.exit(1);
  }
}

async function main() {
  await prepareDatabase();
  console.log("Seeding...");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // -- School + academic session --------------------------------------------------------
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

  // -- School roles: the six defaults, plus one example custom role --------------------------------------------------------
  const { roles: defaultRoles, permissions: defaultRolePermissions } = systemRoleRows(school.id);
  await db.insert(schoolRoles).values(defaultRoles);
  await db.insert(schoolRolePermissions).values(defaultRolePermissions);
  const RECEPTIONIST_MODULES: PermissionModule[] = ["dashboard", "admissions", "students", "announcements"];
  const [receptionistRole] = await db
    .insert(schoolRoles)
    .values({ schoolId: school.id, name: "Receptionist", description: "Front desk: admission inquiries and looking up students.", baseRole: "school_admin", isSystem: false })
    .returning();
  await db.insert(schoolRolePermissions).values(SCHOOL_ROLE_MODULES.map((module) => ({ roleId: receptionistRole.id, module, allowed: RECEPTIONIST_MODULES.includes(module) })));

  // The academic year runs August → June; pick the one today falls in.
  const sessionStartYear = TODAY.getUTCMonth() >= 7 ? TODAY.getUTCFullYear() : TODAY.getUTCFullYear() - 1;
  const sessionStart = new Date(Date.UTC(sessionStartYear, 7, 1));
  const [academicSession] = await db
    .insert(academicSessions)
    .values({ schoolId: school.id, label: `${sessionStartYear} – ${sessionStartYear + 1}`, startDate: iso(sessionStart), endDate: `${sessionStartYear + 1}-06-30`, isActive: true })
    .returning();
  await db.insert(terms).values([
    { sessionId: academicSession.id, name: "Term 1", startDate: iso(sessionStart), endDate: `${sessionStartYear}-12-18` },
    { sessionId: academicSession.id, name: "Term 2", startDate: `${sessionStartYear + 1}-01-05`, endDate: `${sessionStartYear + 1}-06-30` },
  ]);

  // -- Campuses --------------------------------------------------------
  const campusRows = await db
    .insert(campuses)
    .values([
      { schoolId: school.id, name: "Main Campus", city: "Karachi", address: "Shahrah-e-Faisal, Karachi", phone: "+92 21 3456 7890", email: "main@eduflow.edu.pk" },
      { schoolId: school.id, name: "Clifton Campus", city: "Karachi", address: "Block 5, Clifton, Karachi", phone: "+92 21 3456 1234", email: "clifton@eduflow.edu.pk" },
      { schoolId: school.id, name: "Gulshan Campus", city: "Karachi", address: "Block 13-D, Gulshan-e-Iqbal, Karachi", phone: "+92 21 3456 5678", email: "gulshan@eduflow.edu.pk" },
    ])
    .returning();
  const [mainCampus, cliftonCampus, gulshanCampus] = campusRows;
  const campusKey = { main: mainCampus.id, clifton: cliftonCampus.id, gulshan: gulshanCampus.id };

  // -- Subjects --------------------------------------------------------
  const subjectRows = await db
    .insert(subjects)
    .values(SUBJECTS.map((s) => ({ ...s, schoolId: school.id })))
    .returning();
  const subjectId = (code: string) => subjectRows.find((s) => s.code === code)!.id;

  // -- Teachers (every campus has at least as many teachers as classes, so the timetable can always be filled) --------------------------------------------------------
  const teacherSeed = [
    { name: "Ayesha Khan", campus: "main", subjects: ["ENG", "URD"] }, // teacher@eduflow.dev
    { name: "Bilal Ahmed", campus: "main", subjects: ["MATH", "CS"] },
    { name: "Nadia Hussain", campus: "main", subjects: ["SCI", "MATH"] },
    { name: "Imran Qureshi", campus: "main", subjects: ["SST", "ISL"] },
    { name: "Farah Siddiqui", campus: "main", subjects: ["ENG", "SST"] },
    { name: "Usman Tariq", campus: "main", subjects: ["URD", "ISL"] },
    { name: "Kiran Javed", campus: "main", subjects: ["SCI", "CS"] },
    { name: "Sadia Rehman", campus: "clifton", subjects: ["SCI", "MATH"] },
    { name: "Omar Farooq", campus: "clifton", subjects: ["ENG", "SST"] },
    { name: "Hina Aslam", campus: "clifton", subjects: ["URD", "ISL"] },
    { name: "Zeeshan Ali", campus: "clifton", subjects: ["MATH", "CS"] },
    { name: "Mariam Saeed", campus: "gulshan", subjects: ["ENG", "URD", "ISL"] },
    { name: "Kashif Mehmood", campus: "gulshan", subjects: ["MATH", "SCI"] },
    { name: "Rabia Anwar", campus: "gulshan", subjects: ["SST", "CS", "SCI"] },
  ] as const;
  const teacherRows = await db
    .insert(teachers)
    .values(
      teacherSeed.map((t, i) => {
        const employeeId = `EDU-T${String(i + 1).padStart(4, "0")}`;
        return {
          name: t.name,
          employeeId,
          campusId: campusKey[t.campus],
          phone: `+92 300 111${String(2000 + i)}`,
          email: `${employeeId.toLowerCase()}@eduflow.edu.pk`,
          qualification: pick(["M.Ed", "M.A. English", "M.Sc. Mathematics", "B.Ed", "M.Sc. Physics", "M.Phil Education"]),
          joinDate: `${2012 + Math.floor(rand() * 12)}-0${1 + Math.floor(rand() * 8)}-01`,
          status: "active" as const,
        };
      }),
    )
    .returning();
  const teacherByName = (name: string) => teacherRows.find((t) => t.name === name)!;
  const teacherSubjectCodes = new Map(teacherSeed.map((t, i) => [teacherRows[i].id, [...t.subjects] as string[]]));
  await db.insert(teacherSubjects).values(teacherSeed.flatMap((t, i) => t.subjects.map((code) => ({ teacherId: teacherRows[i].id, subjectId: subjectId(code) }))));

  // -- Classes --------------------------------------------------------
  const classSeed = [
    { grade: "Grade 1", section: "A", campus: "main", teacher: "Ayesha Khan" },
    { grade: "Grade 1", section: "B", campus: "main", teacher: "Farah Siddiqui" },
    { grade: "Grade 2", section: "A", campus: "main", teacher: "Usman Tariq" },
    { grade: "Grade 5", section: "A", campus: "main", teacher: "Bilal Ahmed" },
    { grade: "Grade 8", section: "A", campus: "main", teacher: "Nadia Hussain" },
    { grade: "O-Level", section: "A", campus: "main", teacher: "Imran Qureshi" },
    { grade: "Grade 1", section: "A", campus: "clifton", teacher: "Sadia Rehman" },
    { grade: "Grade 2", section: "A", campus: "clifton", teacher: "Hina Aslam" },
    { grade: "Grade 5", section: "A", campus: "clifton", teacher: "Omar Farooq" },
    { grade: "Grade 1", section: "A", campus: "gulshan", teacher: "Mariam Saeed" },
    { grade: "Grade 5", section: "A", campus: "gulshan", teacher: "Kashif Mehmood" },
  ] as const;
  const classRows = await db
    .insert(classes)
    .values(classSeed.map((c) => ({ grade: c.grade, section: c.section, campusId: campusKey[c.campus], classTeacherId: teacherByName(c.teacher).id, studentCapacity: 30, status: "active" as const })))
    .returning();
  const classFor = (campus: keyof typeof campusKey, grade: string, section = "A") => classRows.find((c) => c.campusId === campusKey[campus] && c.grade === grade && c.section === section)!;
  const classSubjectCodes = new Map(classRows.map((c) => [c.id, GRADE_SUBJECTS[c.grade]]));
  await db.insert(classSubjects).values(classRows.flatMap((c) => classSubjectCodes.get(c.id)!.map((code) => ({ classId: c.id, subjectId: subjectId(code) }))));

  // -- Rooms (one homeroom per class, plus a lab and a hall per campus) --------------------------------------------------------
  const roomValues: (typeof rooms.$inferInsert)[] = [];
  for (const campus of campusRows) {
    const campusClasses = classRows.filter((c) => c.campusId === campus.id);
    campusClasses.forEach((_, i) => roomValues.push({ campusId: campus.id, name: `Room ${campusRows.indexOf(campus) + 1}0${i + 1}`, type: "classroom", capacity: 30 }));
    roomValues.push({ campusId: campus.id, name: "Science Lab", type: "lab", capacity: 25 });
    roomValues.push({ campusId: campus.id, name: campus === mainCampus ? "Main Hall" : "Activity Hall", type: "hall", capacity: 150 });
  }
  const roomRows = await db.insert(rooms).values(roomValues).returning();
  const homeroomByClass = new Map<string, string>();
  for (const campus of campusRows) {
    const classroomIds = roomRows.filter((r) => r.campusId === campus.id && r.type === "classroom").map((r) => r.id);
    classRows.filter((c) => c.campusId === campus.id).forEach((c, i) => homeroomByClass.set(c.id, classroomIds[i]));
  }

  // -- Departments --------------------------------------------------------
  const departmentSeed = [
    { name: "Languages", codes: ["ENG", "URD"] },
    { name: "Sciences & Mathematics", codes: ["MATH", "SCI", "CS"] },
    { name: "Humanities", codes: ["SST", "ISL"] },
  ];
  for (const campus of campusRows) {
    const campusTeachers = teacherRows.filter((t) => t.campusId === campus.id);
    for (const dept of departmentSeed) {
      const head = campusTeachers.find((t) => teacherSubjectCodes.get(t.id)!.some((code) => dept.codes.includes(code)));
      const [row] = await db.insert(departments).values({ campusId: campus.id, name: dept.name, headTeacherId: head?.id ?? null, status: "active" }).returning();
      await db.insert(departmentSubjects).values(dept.codes.map((code) => ({ departmentId: row.id, subjectId: subjectId(code) })));
    }
  }

  // -- Students --------------------------------------------------------
  type StudentPlan = {
    name: string;
    gender: "male" | "female";
    parentName: string;
    classId: string;
    status: "active" | "withdrawn" | "alumni";
    attendanceRate: number; // probability of being present on a given day
    ability: number; // 0–1, drives exam marks and homework grades
    payer: "on_time" | "late" | "defaulter";
  };
  const plans: StudentPlan[] = [];
  const usedNames = new Set<string>();
  function plan(classId: string, overrides: Partial<StudentPlan> = {}): StudentPlan {
    const gender = overrides.gender ?? (chance(0.5) ? "male" : "female");
    const surname = pick(SURNAMES);
    let name = overrides.name ?? `${pick(gender === "male" ? MALE_NAMES : FEMALE_NAMES)} ${surname}`;
    while (usedNames.has(name)) name = `${pick(gender === "male" ? MALE_NAMES : FEMALE_NAMES)} ${pick(SURNAMES)}`;
    usedNames.add(name);
    const p: StudentPlan = {
      name,
      gender,
      parentName: overrides.parentName ?? `Mr. ${pick(FATHER_NAMES)} ${surname}`,
      classId,
      status: "active",
      attendanceRate: between(0.9, 0.99),
      ability: between(0.5, 0.95),
      payer: rand() < 0.72 ? "on_time" : rand() < 0.55 ? "late" : "defaulter",
      ...overrides,
    };
    plans.push(p);
    return p;
  }

  // parent@eduflow.dev's two children (siblings, both at Main) — always first, with predictable data.
  const parentName = "Mr. Raza Ahmed";
  plan(classFor("main", "Grade 1").id, { name: "Ahmed Raza", gender: "male", parentName, attendanceRate: 0.95, ability: 0.82, payer: "on_time" });
  plan(classFor("main", "Grade 5").id, { name: "Ayaan Raza", gender: "male", parentName, attendanceRate: 0.9, ability: 0.7, payer: "late" });

  for (const cls of classRows) {
    const target = cls.campusId === mainCampus.id ? 9 : 8;
    while (plans.filter((p) => p.classId === cls.id).length < target) plan(cls.id);
  }
  // A couple of students per campus with poor attendance (drives the <80% alerts) and a few weak performers.
  for (const campus of campusRows) {
    const campusPlans = plans.filter((p) => classRows.find((c) => c.id === p.classId)!.campusId === campus.id && p.parentName !== parentName);
    campusPlans.slice(2, 4).forEach((p) => (p.attendanceRate = between(0.68, 0.78)));
    campusPlans.slice(5, 7).forEach((p) => (p.ability = between(0.3, 0.42)));
  }
  // Lifecycle cases: two graduated (alumni) from O-Level last June, one withdrawn at Clifton.
  const olevel = classFor("main", "O-Level");
  const alumniPlans = [plan(olevel.id, { status: "alumni" }), plan(olevel.id, { status: "alumni" })];
  const withdrawnPlan = plans.find((p) => p.classId === classFor("clifton", "Grade 5").id)!;
  withdrawnPlan.status = "withdrawn";
  const withdrawalDate = daysAgo(18);
  // One student transferred from Gulshan to Main earlier this session (history only — they're active at Main now).
  const transferredPlan = plans.filter((p) => p.classId === classFor("main", "Grade 5").id)[2];
  const transferDate = addDays(sessionStart, 20) < TODAY ? addDays(sessionStart, 20) : daysAgo(5);

  const studentRows = await db
    .insert(students)
    .values(
      plans.map((p, i) => {
        const cls = classRows.find((c) => c.id === p.classId)!;
        const age = GRADE_AGE[cls.grade] + (p.status === "alumni" ? 1 : 0);
        const rollNumber = plans.filter((q, j) => j < i && q.classId === p.classId).length + 1;
        return {
          name: p.name,
          rollNumber: String(rollNumber).padStart(2, "0"),
          admissionNo: `EDU-${sessionStartYear - Math.floor(rand() * 4)}-${1000 + i}`,
          classId: p.classId,
          campusId: cls.campusId,
          gender: p.gender,
          dob: `${sessionStartYear - age}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
          bloodGroup: pick(BLOOD_GROUPS),
          parentName: p.parentName,
          parentPhone: `+92 3${Math.floor(between(0, 4))}${Math.floor(between(0, 10))} ${Math.floor(between(1000000, 9999999))}`,
          parentEmail: `${p.parentName.replace(/^Mr\. /, "").toLowerCase().replace(/\s+/g, ".")}@example.com`,
          address: `House ${Math.floor(between(1, 300))}, ${pick(["DHA Phase 6", "Clifton Block 2", "Gulshan Block 13", "PECHS", "North Nazimabad", "Bahadurabad"])}, Karachi`,
          admissionDate: `${sessionStartYear - Math.floor(rand() * 4)}-08-01`,
          status: p.status,
          ...studentExtras(i, p.name),
        };
      }),
    )
    .returning();
  const planOf = new Map(studentRows.map((s, i) => [s.id, plans[i]]));
  const activeStudents = studentRows.filter((s) => s.status === "active");
  const ahmed = studentRows[0];
  const ayaan = studentRows[1];

  // -- Users (one per role, dev password for all) --------------------------------------------------------
  const teacherUserTeacher = teacherByName("Ayesha Khan");
  const userRows = await db
    .insert(users)
    .values([
      { role: "platform_admin", name: "Platform Admin", email: "platform@eduflow.dev", passwordHash, avatarSeed: "Platform Admin" },
      { schoolId: school.id, role: "school_owner", name: "Bilal Farooqi", email: "owner@eduflow.dev", passwordHash, avatarSeed: "Bilal Farooqi" },
      { schoolId: school.id, role: "school_admin", name: "Ahsan Raza", email: "admin@eduflow.dev", passwordHash, avatarSeed: "Ahsan Raza" },
      { schoolId: school.id, campusId: cliftonCampus.id, role: "campus_admin", name: "Mahnoor Sheikh", email: "campus.admin@eduflow.dev", passwordHash, avatarSeed: "Mahnoor Sheikh" },
      { schoolId: school.id, role: "accountant", name: "Sana Malik", email: "accountant@eduflow.dev", passwordHash, avatarSeed: "Sana Malik" },
      { schoolId: school.id, campusId: mainCampus.id, teacherId: teacherUserTeacher.id, role: "teacher", name: teacherUserTeacher.name, email: "teacher@eduflow.dev", passwordHash, avatarSeed: teacherUserTeacher.name },
      { schoolId: school.id, campusId: mainCampus.id, role: "parent", name: parentName, email: "parent@eduflow.dev", passwordHash, avatarSeed: parentName },
      { schoolId: school.id, role: "school_admin", schoolRoleId: receptionistRole.id, name: "Rabia Aslam", email: "reception@eduflow.dev", passwordHash, avatarSeed: "Rabia Aslam" },
    ])
    .returning();
  const userByRole = (role: Role) => userRows.find((u) => u.role === role)!;
  const adminUser = userRows.find((u) => u.role === "school_admin" && !u.schoolRoleId)!;
  const accountantUser = userByRole("accountant");
  const teacherUser = userByRole("teacher");
  await db.insert(parentChildren).values([
    { parentUserId: userByRole("parent").id, studentId: ahmed.id },
    { parentUserId: userByRole("parent").id, studentId: ayaan.id },
  ]);

  // -- Student lifecycle history --------------------------------------------------------
  const lifecycleValues: (typeof studentLifecycleEvents.$inferInsert)[] = [
    ...studentRows
      .filter((s) => alumniPlans.includes(planOf.get(s.id)!))
      .map((s) => ({ studentId: s.id, type: "promotion" as const, date: `${sessionStartYear}-06-30`, reason: "Completed O-Levels", resultingStatus: "alumni" as const, fromClassId: olevel.id, recordedBy: adminUser.id })),
  ];
  const withdrawnStudent = studentRows.find((s) => planOf.get(s.id) === withdrawnPlan)!;
  lifecycleValues.push({ studentId: withdrawnStudent.id, type: "withdrawal", date: iso(withdrawalDate), reason: "Family relocated to Lahore", resultingStatus: "withdrawn", fromClassId: withdrawnStudent.classId, fromCampusId: withdrawnStudent.campusId, leavingCertificateIssued: "true", recordedBy: adminUser.id });
  const transferredStudent = studentRows.find((s) => planOf.get(s.id) === transferredPlan)!;
  lifecycleValues.push({ studentId: transferredStudent.id, type: "transfer", date: iso(transferDate), reason: "Moved closer to Main Campus", fromClassId: classFor("gulshan", "Grade 5").id, toClassId: transferredStudent.classId, fromCampusId: gulshanCampus.id, toCampusId: mainCampus.id, recordedBy: adminUser.id });
  await db.insert(studentLifecycleEvents).values(lifecycleValues);

  // -- Fee categories + grade scale --------------------------------------------------------
  await db.insert(feeCategories).values(["Tuition Fee", "Admission Fee", "Examination Fee", "Annual Fund", "Transport Fee"].map((name) => ({ schoolId: school.id, name, status: "active" as const })));
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

  // -- Timetable (published for every class, no teacher double-booked) --------------------------------------------------------
  await db.insert(timetableConfigs).values({ schoolId: school.id, workingDays: [...WORKING_DAYS], breakAfterPeriod: 3 });
  await db.insert(periods).values(PERIODS.map((p) => ({ ...p, schoolId: school.id })));
  const slotValues: (typeof timetableSlots.$inferInsert)[] = [];
  for (const campus of campusRows) {
    const campusClasses = classRows.filter((c) => c.campusId === campus.id);
    const campusTeachers = teacherRows.filter((t) => t.campusId === campus.id);
    WORKING_DAYS.forEach((day, dayIndex) => {
      for (const p of PERIODS) {
        const busy = new Set<string>();
        campusClasses.forEach((cls, classIndex) => {
          const codes = classSubjectCodes.get(cls.id)!;
          const start = (dayIndex * PERIODS.length + p.period + classIndex * 2) % codes.length;
          // Try the class's subjects in rotation order until one has a free teacher.
          for (let k = 0; k < codes.length; k++) {
            const code = codes[(start + k) % codes.length];
            const teacher = campusTeachers.find((t) => !busy.has(t.id) && teacherSubjectCodes.get(t.id)!.includes(code));
            if (!teacher) continue;
            busy.add(teacher.id);
            slotValues.push({ classId: cls.id, day, period: p.period, startTime: p.startTime, endTime: p.endTime, subjectId: subjectId(code), teacherId: teacher.id, roomId: homeroomByClass.get(cls.id) });
            break;
          }
        });
      }
    });
  }
  await insertChunked(timetableSlots, slotValues);
  await db.insert(timetableStatus).values(classRows.map((c) => ({ classId: c.id, status: "published" as const })));
  /** The teacher who actually teaches this class+subject per the timetable — homework/classwork/syllabus are attributed to them, matching the app's own teacher authorization. */
  const teacherFor = (classId: string, code: string) => slotValues.find((s) => s.classId === classId && s.subjectId === subjectId(code))?.teacherId;
  const userIdForTeacher = (teacherId: string) => (teacherId === teacherUserTeacher.id ? teacherUser.id : adminUser.id);

  // -- Attendance (last ~8 weeks of school days) --------------------------------------------------------
  const schoolDays = recentSchoolDays(40, sessionStart);
  const attendanceValues: (typeof attendanceRecords.$inferInsert)[] = [];
  for (const s of studentRows) {
    const p = planOf.get(s.id)!;
    if (p.status === "alumni") continue;
    const cls = classRows.find((c) => c.id === s.classId)!;
    for (const day of schoolDays) {
      if (p.status === "withdrawn" && day >= withdrawalDate) continue;
      const roll = rand();
      const status = roll < p.attendanceRate ? (chance(0.05) ? "late" : "present") : chance(0.7) ? "absent" : "leave";
      attendanceValues.push({ studentId: s.id, classId: s.classId, date: iso(day), status, markedBy: userIdForTeacher(cls.classTeacherId) });
    }
  }
  // Correction requests from the teacher@ account on their own class (Grade 1-A, Main): two pending, one approved, one rejected.
  const grade1A = classFor("main", "Grade 1");
  const correctionCandidates = attendanceValues.filter((a) => a.classId === grade1A.id && (a.status === "absent" || a.status === "late")).slice(-4);
  const correctionValues: (typeof attendanceCorrections.$inferInsert)[] = correctionCandidates.map((record, i) => {
    const status = (["pending", "pending", "approved", "rejected"] as const)[i];
    const requestedStatus = "present" as const;
    const correction = {
      studentId: record.studentId,
      classId: record.classId,
      date: record.date,
      currentStatus: record.status,
      requestedStatus,
      reason: record.status === "absent" ? "Student was present — marked absent by mistake." : "Arrived on time; bus delay was for a different route.",
      status,
      requestedBy: teacherUser.id,
      requestedAt: new Date(`${record.date}T09:00:00Z`),
      reviewedBy: status === "pending" ? null : adminUser.id,
      reviewNote: status === "approved" ? "Verified with the gate register." : status === "rejected" ? "Gate register shows late arrival." : null,
    };
    if (status === "approved") record.status = requestedStatus; // approving rewrites the underlying record, like the app does
    return correction;
  });
  await insertChunked(attendanceRecords, attendanceValues);
  if (correctionValues.length > 0) await db.insert(attendanceCorrections).values(correctionValues);

  // -- Fees: structure, monthly invoices, payments, a sibling concession, one reversal --------------------------------------------------------
  const tuitionFor = (cls: (typeof classRows)[number]) => GRADE_TUITION[cls.grade] + (cls.campusId === cliftonCampus.id ? 1500 : cls.campusId === gulshanCampus.id ? -500 : 0);
  await db.insert(feeStructureItems).values(
    classRows.flatMap((cls) => [
      { campusId: cls.campusId, classId: cls.id, name: "Tuition Fee", amount: tuitionFor(cls), frequency: "monthly" as const },
      { campusId: cls.campusId, classId: cls.id, name: "Examination Fee", amount: 2000, frequency: "quarterly" as const },
      { campusId: cls.campusId, classId: cls.id, name: "Annual Fund", amount: 5000, frequency: "annual" as const },
    ]),
  );

  // Invoice months: from the session's first month (at most the last 4 months) through the current month.
  const invoiceMonths: Date[] = [];
  for (let m = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1)); m >= sessionStart && invoiceMonths.length < 4; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1))) {
    invoiceMonths.unshift(m);
  }
  const invoiceSeqByPrefix = new Map<string, number>();
  let paymentsCount = 0;
  let reversalDone = false;
  for (const monthStart of invoiceMonths) {
    const issueDate = monthStart;
    const dueDate = addDays(monthStart, 9);
    const isCurrentMonth = monthStart.getUTCMonth() === TODAY.getUTCMonth() && monthStart.getUTCFullYear() === TODAY.getUTCFullYear();
    const prefix = `EDU-INV-${iso(issueDate).replace(/-/g, "").slice(0, 6)}-`;
    for (const s of studentRows) {
      const p = planOf.get(s.id)!;
      if (p.status === "alumni") continue;
      if (p.status === "withdrawn" && monthStart > withdrawalDate) continue;
      const cls = classRows.find((c) => c.id === s.classId)!;
      const items: { name: string; amount: number; isDiscount?: boolean }[] = [{ name: "Tuition Fee", amount: tuitionFor(cls) }];
      if (monthStart.getTime() === sessionStart.getTime()) items.push({ name: "Annual Fund", amount: 5000 });
      const isSiblingDiscounted = s.id === ayaan.id;
      const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
      if (isSiblingDiscounted) items.push({ name: "Sibling Discount (10%)", amount: -Math.round(subtotal * 0.1), isDiscount: true });
      const total = items.reduce((sum, i) => sum + i.amount, 0);

      // How much has been paid, by this student's payer profile and whether the due date has passed.
      const dueHasPassed = dueDate < TODAY;
      let paid = 0;
      if (p.payer === "on_time") paid = !isCurrentMonth || dueHasPassed || chance(0.55) ? total : 0;
      else if (p.payer === "late") paid = isCurrentMonth ? (chance(0.3) ? Math.round(total / 2) : 0) : chance(0.6) ? total : Math.round(total / 2);
      else paid = isCurrentMonth || chance(0.5) ? 0 : Math.round(total / 2);
      const statusFor = (amountPaid: number) => (amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : dueHasPassed ? "overdue" : "unpaid");

      const seq = (invoiceSeqByPrefix.get(prefix) ?? 0) + 1;
      invoiceSeqByPrefix.set(prefix, seq);
      const [invoice] = await db
        .insert(feeInvoices)
        .values({ studentId: s.id, invoiceNo: `${prefix}${String(seq).padStart(4, "0")}`, month: monthLabel(monthStart), issueDate: iso(issueDate), dueDate: iso(dueDate), totalAmount: total, paidAmount: paid, status: statusFor(paid) })
        .returning();
      await db.insert(feeInvoiceItems).values(items.map((item) => ({ invoiceId: invoice.id, name: item.name, amount: item.amount, isDiscount: item.isDiscount ?? false })));
      if (isSiblingDiscounted) {
        await db.insert(feeConcessions).values({ studentId: s.id, invoiceId: invoice.id, type: "sibling_discount", label: "Sibling Discount (10%)", percentage: 10, reason: "Sibling (Ahmed Raza) enrolled at Main Campus", approvedBy: adminUser.id, effectiveDate: iso(sessionStart), status: "active" });
      }

      if (paid > 0) {
        const lastPayDay = new Date(Math.min((p.payer === "on_time" ? dueDate : addDays(dueDate, 12)).getTime(), TODAY.getTime()));
        const payDate = addDays(issueDate, Math.floor(rand() * Math.max(1, (lastPayDay.getTime() - issueDate.getTime()) / DAY_MS)));
        const method = pick(["cash", "cash", "bank_transfer", "bank_transfer", "card", "cheque"] as const);
        const [payment] = await db
          .insert(feePayments)
          .values({ invoiceId: invoice.id, studentId: s.id, amount: paid, method, date: iso(payDate), receivedBy: accountantUser.id, reference: method === "bank_transfer" ? `IBFT-${Math.floor(between(100000, 999999))}` : method === "cheque" ? `CHQ-${Math.floor(between(10000, 99999))}` : null })
          .returning();
        paymentsCount++;

        // One bounced cheque: a fully paid, previous-month invoice at Main gets reversed back to overdue.
        if (!reversalDone && !isCurrentMonth && method === "cheque" && paid === total && s.campusId === mainCampus.id && s.id !== ahmed.id) {
          reversalDone = true;
          await db.insert(feePaymentReversals).values({ paymentId: payment.id, invoiceId: invoice.id, studentId: s.id, amount: paid, reason: "Cheque bounced — insufficient funds", date: iso(addDays(payDate, 3)), reversedBy: accountantUser.id });
          await db.update(feeInvoices).set({ paidAmount: 0, status: statusFor(0) }).where(eq(feeInvoices.id, invoice.id));
        }
      }
    }
  }

  // -- Exams: one published, one awaiting publication, one upcoming — per campus --------------------------------------------------------
  const coreCodes = ["ENG", "URD", "MATH", "SCI"];
  const examPlan = [
    { name: "Unit Test 1", start: daysAgo(35), status: "completed" as const, published: true, marks: "published" as const, codes: coreCodes },
    { name: "Unit Test 2", start: daysAgo(10), status: "completed" as const, published: false, marks: "submitted" as const, codes: coreCodes },
    { name: "Mid-Term Examination", start: addDays(TODAY, 30), status: "scheduled" as const, published: false, marks: null, codes: SUBJECTS.map((s) => s.code) as string[] },
  ];
  let marksCount = 0;
  for (const campus of campusRows) {
    const campusClasses = classRows.filter((c) => c.campusId === campus.id);
    for (const e of examPlan) {
      const [exam] = await db
        .insert(exams)
        .values({ campusId: campus.id, name: e.name, term: "Term 1", startDate: iso(e.start), endDate: iso(addDays(e.start, 4)), totalMarks: 100, passingMarks: 40, status: e.status, resultsPublished: e.published })
        .returning();
      await db.insert(examClasses).values(campusClasses.map((c) => ({ examId: exam.id, classId: c.id })));
      await db.insert(examSubjects).values(e.codes.map((code) => ({ examId: exam.id, subjectId: subjectId(code) })));
      if (!e.marks) continue;
      const marksValues: (typeof marksEntries.$inferInsert)[] = [];
      for (const s of activeStudents.filter((st) => st.campusId === campus.id)) {
        const ability = planOf.get(s.id)!.ability;
        for (const code of e.codes) {
          if (!classSubjectCodes.get(s.classId)!.includes(code)) continue;
          const obtained = Math.max(15, Math.min(99, Math.round(ability * 100 + between(-12, 12))));
          marksValues.push({ examId: exam.id, studentId: s.id, subjectId: subjectId(code), obtainedMarks: obtained, totalMarks: 100, status: e.marks });
        }
      }
      await insertChunked(marksEntries, marksValues);
      marksCount += marksValues.length;
    }
  }

  // -- Syllabus topics (every class × subject; earlier topics completed, one in progress) --------------------------------------------------------
  const topicValues: (typeof syllabusTopics.$inferInsert)[] = [];
  const weeksSinceStart = Math.max(0, Math.floor((TODAY.getTime() - sessionStart.getTime()) / (7 * DAY_MS)));
  for (const cls of classRows) {
    for (const code of classSubjectCodes.get(cls.id)!) {
      TOPICS[code].forEach((title, i) => {
        const plannedStart = addDays(sessionStart, i * 21);
        const plannedEnd = addDays(plannedStart, 20);
        const completedCount = Math.min(TOPICS[code].length - 1, Math.floor(weeksSinceStart / 3));
        const status = i < completedCount ? "completed" : i === completedCount ? "in_progress" : "not_started";
        topicValues.push({
          classId: cls.id,
          subjectId: subjectId(code),
          academicSessionId: academicSession.id,
          title,
          description: `${title} — ${cls.grade} ${SUBJECTS.find((s) => s.code === code)!.name}.`,
          orderIndex: i,
          plannedStartDate: iso(plannedStart),
          plannedEndDate: iso(plannedEnd),
          status,
          completedDate: status === "completed" ? iso(plannedEnd < TODAY ? plannedEnd : TODAY) : null,
        });
      });
    }
  }
  const topicRows: (typeof syllabusTopics.$inferSelect)[] = [];
  for (let i = 0; i < topicValues.length; i += 500) topicRows.push(...(await db.insert(syllabusTopics).values(topicValues.slice(i, i + 500)).returning()));
  const inProgressTopic = (classId: string, code: string) => topicRows.find((t) => t.classId === classId && t.subjectId === subjectId(code) && t.status === "in_progress");

  // -- Classwork (last 6 school days, from each day's timetable) --------------------------------------------------------
  const classworkValues: (typeof classwork.$inferInsert)[] = [];
  for (const day of recentSchoolDays(6, sessionStart)) {
    const dayCode = WEEKDAY_CODES[day.getUTCDay()];
    for (const cls of classRows) {
      const daySlots = slotValues.filter((s) => s.classId === cls.id && s.day === dayCode).slice(0, 2);
      for (const slot of daySlots) {
        const code = subjectRows.find((s) => s.id === slot.subjectId)!.code;
        const topic = inProgressTopic(cls.id, code);
        classworkValues.push({
          classId: cls.id,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          syllabusTopicId: topic?.id ?? null,
          date: iso(day),
          title: topic ? `${topic.title}: class exercise` : "Class exercise",
          description: pick(["Worked through textbook exercises in pairs.", "Board work followed by a short quiz.", "Group activity and discussion.", "Read aloud and answered comprehension questions."]),
        });
      }
    }
  }
  await insertChunked(classwork, classworkValues);

  // -- Homework (two past-due + one open per class) with submissions --------------------------------------------------------
  let homeworkCount = 0;
  let submissionCount = 0;
  for (const cls of classRows) {
    const codes = classSubjectCodes.get(cls.id)!;
    const assignments = [
      { assigned: daysAgo(12), due: daysAgo(7), code: codes[0], graded: true },
      { assigned: daysAgo(5), due: daysAgo(1), code: codes[2 % codes.length], graded: false },
      { assigned: daysAgo(1), due: addDays(TODAY, 4), code: codes[1 % codes.length], graded: false },
    ];
    for (const a of assignments) {
      const teacherId = teacherFor(cls.id, a.code);
      if (!teacherId) continue;
      const topic = inProgressTopic(cls.id, a.code);
      const [hw] = await db
        .insert(homework)
        .values({
          classId: cls.id,
          subjectId: subjectId(a.code),
          teacherId,
          title: topic ? `${topic.title} worksheet` : `${SUBJECTS.find((s) => s.code === a.code)!.name} worksheet`,
          description: "Complete the exercises from today's lesson in your notebook. Show your working.",
          assignedDate: iso(a.assigned),
          dueDate: iso(a.due),
        })
        .returning();
      homeworkCount++;
      const isOpen = a.due >= TODAY;
      const submissionValues: (typeof homeworkSubmissions.$inferInsert)[] = [];
      for (const s of activeStudents.filter((st) => st.classId === cls.id)) {
        // parent@'s children never auto-submit open homework, so the Parent portal always has something to submit.
        if (isOpen && (s.id === ahmed.id || s.id === ayaan.id)) continue;
        if (!chance(isOpen ? 0.3 : 0.82)) continue;
        const ability = planOf.get(s.id)!.ability;
        const grade = ability > 0.85 ? "A" : ability > 0.7 ? "B" : ability > 0.55 ? "C" : "D";
        submissionValues.push({
          homeworkId: hw.id,
          studentId: s.id,
          status: a.graded ? "graded" : "submitted",
          submissionText: "Completed all questions. Attached photo of notebook pages.",
          submittedAt: new Date(addDays(a.due, -Math.floor(between(0, 3))).getTime() + 15 * 3_600_000),
          grade: a.graded ? grade : null,
          teacherComment: a.graded ? pick(["Well done!", "Good effort — check question 3.", "Neat work.", "Please show your working next time."]) : null,
          gradedAt: a.graded ? addDays(a.due, 1) : null,
          gradedBy: a.graded ? userIdForTeacher(teacherId) : null,
        });
      }
      if (submissionValues.length > 0) await db.insert(homeworkSubmissions).values(submissionValues);
      submissionCount += submissionValues.length;
    }
  }

  // -- Admissions pipeline --------------------------------------------------------
  const inquirySeed = [
    { campus: "main", stage: "inquiry", grade: "Grade 1", source: "Walk-in", age: 2 },
    { campus: "main", stage: "applied", grade: "Grade 2", source: "Website", age: 6 },
    { campus: "main", stage: "interview", grade: "Grade 5", source: "Referral", age: 11 },
    { campus: "main", stage: "offered", grade: "Grade 8", source: "Phone Call", age: 18 },
    { campus: "main", stage: "rejected", grade: "O-Level", source: "Website", age: 25 },
    { campus: "clifton", stage: "inquiry", grade: "Grade 1", source: "Social Media", age: 1 },
    { campus: "clifton", stage: "applied", grade: "Grade 5", source: "Referral", age: 8 },
    { campus: "clifton", stage: "offered", grade: "Grade 2", source: "Walk-in", age: 14 },
    { campus: "gulshan", stage: "inquiry", grade: "Grade 5", source: "Phone Call", age: 3 },
    { campus: "gulshan", stage: "interview", grade: "Grade 1", source: "Website", age: 9 },
    { campus: "gulshan", stage: "admitted", grade: "Grade 1", source: "Referral", age: 30 },
  ] as const;
  const gulshanGrade1Student = activeStudents.find((s) => s.classId === classFor("gulshan", "Grade 1").id)!;
  await db.insert(inquiries).values(
    inquirySeed.map((q) => {
      const gender = chance(0.5) ? "male" : "female";
      const surname = pick(SURNAMES);
      const isAdmitted = q.stage === "admitted";
      return {
        campusId: campusKey[q.campus],
        childName: isAdmitted ? gulshanGrade1Student.name : `${pick(gender === "male" ? MALE_NAMES : FEMALE_NAMES)} ${surname}`,
        gradeAppliedFor: q.grade,
        parentName: isAdmitted ? gulshanGrade1Student.parentName : `Mr. ${pick(FATHER_NAMES)} ${surname}`,
        parentPhone: `+92 321 ${Math.floor(between(1000000, 9999999))}`,
        parentEmail: `${surname.toLowerCase()}.family@example.com`,
        stage: q.stage,
        source: q.source,
        notes: q.stage === "rejected" ? "No seats available in O-Level this session." : q.stage === "interview" ? "Interview scheduled with the coordinator." : null,
        convertedStudentId: isAdmitted ? gulshanGrade1Student.id : null,
        createdAt: daysAgo(q.age),
        updatedAt: daysAgo(Math.max(0, q.age - 2)),
      };
    }),
  );

  // -- Staff leave --------------------------------------------------------
  await db.insert(staffLeaveRequests).values([
    { teacherId: teacherUserTeacher.id, type: "sick", startDate: iso(daysAgo(20)), endDate: iso(daysAgo(19)), reason: "Fever", status: "approved", requestedAt: daysAgo(21), reviewedBy: adminUser.id, reviewNote: "Get well soon." },
    { teacherId: teacherUserTeacher.id, type: "casual", startDate: iso(addDays(TODAY, 7)), endDate: iso(addDays(TODAY, 7)), reason: "Family wedding", status: "pending", requestedAt: daysAgo(1) },
    { teacherId: teacherByName("Bilal Ahmed").id, type: "annual", startDate: iso(addDays(TODAY, 14)), endDate: iso(addDays(TODAY, 18)), reason: "Travelling to Islamabad", status: "pending", requestedAt: daysAgo(2) },
    { teacherId: teacherByName("Sadia Rehman").id, type: "sick", startDate: iso(TODAY), endDate: iso(addDays(TODAY, 1)), reason: "Medical appointment", status: "pending", requestedAt: daysAgo(0) },
    { teacherId: teacherByName("Kashif Mehmood").id, type: "other", startDate: iso(daysAgo(6)), endDate: iso(daysAgo(6)), reason: "Personal work", status: "rejected", requestedAt: daysAgo(9), reviewedBy: adminUser.id, reviewNote: "Unit Test 2 invigilation that day." },
  ]);

  // -- Announcements --------------------------------------------------------
  await db.insert(announcements).values([
    { schoolId: school.id, campusId: null, title: "Mid-Term Examination Schedule", body: "Mid-term examinations begin next month. Date sheets will be shared through class teachers this week.", audience: "all", priority: "important", author: adminUser.name, publishedAt: daysAgo(2) },
    { schoolId: school.id, campusId: null, title: "Parent-Teacher Meeting", body: "PTM will be held on Saturday from 9:00 AM to 12:00 PM. Report cards for Unit Test 1 will be discussed.", audience: "parents", priority: "normal", author: adminUser.name, publishedAt: daysAgo(5) },
    { schoolId: school.id, campusId: null, title: "Staff Professional Development Workshop", body: "All teaching staff are requested to attend the workshop on activity-based learning in the Main Hall.", audience: "teachers", priority: "normal", author: adminUser.name, publishedAt: daysAgo(9) },
    { schoolId: school.id, campusId: mainCampus.id, title: "Sports Day Practice", body: "Sports Day practice sessions will run after school on Tuesdays and Thursdays.", audience: "all", priority: "normal", author: adminUser.name, publishedAt: daysAgo(12) },
    { schoolId: school.id, campusId: cliftonCampus.id, title: "Clifton Campus Science Fair", body: "Students of Grades 2 and 5 will present their science projects. Parents are welcome.", audience: "parents", priority: "important", author: "Mahnoor Sheikh", publishedAt: daysAgo(3) },
    { schoolId: school.id, campusId: gulshanCampus.id, title: "Early Dismissal on Friday", body: "Due to water supply maintenance, Gulshan Campus will close at 11:30 AM this Friday.", audience: "all", priority: "important", author: adminUser.name, publishedAt: daysAgo(20) },
  ]);

  const outstanding = await db.select({ status: feeInvoices.status }).from(feeInvoices);
  console.log("Seed complete.");
  console.log(
    `  ${campusRows.length} campuses, ${teacherRows.length} teachers, ${classRows.length} classes, ${studentRows.length} students (${activeStudents.length} active)\n` +
      `  ${attendanceValues.length} attendance records over ${schoolDays.length} school days, ${correctionValues.length} correction requests\n` +
      `  ${outstanding.length} invoices across ${invoiceMonths.map(monthLabel).join(", ")} (${outstanding.filter((i) => i.status !== "paid").length} not fully paid), ${paymentsCount} payments\n` +
      `  ${examPlan.length * campusRows.length} exams, ${marksCount} marks entries, ${slotValues.length} timetable slots\n` +
      `  ${topicValues.length} syllabus topics, ${classworkValues.length} classwork entries, ${homeworkCount} homework, ${submissionCount} submissions`,
  );
  console.log("\nDev login credentials (password for every account):", DEV_PASSWORD);
  console.log("  platform@eduflow.dev       — Platform Admin");
  console.log("  owner@eduflow.dev          — School Owner");
  console.log("  admin@eduflow.dev          — School Admin");
  console.log("  campus.admin@eduflow.dev   — Campus Admin (Clifton)");
  console.log("  accountant@eduflow.dev     — Accountant");
  console.log("  teacher@eduflow.dev        — Teacher (Ayesha Khan, class teacher of Grade 1-A, Main)");
  console.log("  parent@eduflow.dev         — Parent (Ahmed Raza, Grade 1-A, and Ayaan Raza, Grade 5-A)");
  console.log("  reception@eduflow.dev      — Receptionist (custom role: Dashboard, Admissions, Students, Announcements)");
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
