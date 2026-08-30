import type { Campus, ClassSection, Room, Subject, Teacher } from "@/lib/types";
import { emailFrom, fullName, intBetween, mulberry32, phoneNumber, pick } from "@/lib/mock/names";
import { SCHOOLS } from "@/lib/mock/schools";

/*
 * Campuses/Subjects/Classes/Teachers are the "reference data" every other
 * mock generator (students, attendance, fees, exams, timetable) builds from
 * at module-init time, so they can't simply live inside AppDataState from
 * birth without a large rewrite of every generator. Instead these are kept
 * as mutable `let` bindings: AppDataProvider owns the authoritative copies
 * in its reducer, and re-points these bindings (via the sync* functions
 * below) to the latest array on every store change. Any component that
 * reads these directly (or via classLabel/campusName/subjectName/
 * teacherName) is subscribed to the store through some other hook already,
 * so it re-renders when the store changes and picks up the synced value.
 * This is what makes "Add Class" show up immediately in Student/Exam/Fee
 * dropdowns and "Edit Teacher" show up in Timetable, without threading the
 * live arrays through 20+ files as props.
 */

export let CAMPUSES: Campus[] = [
  { id: "main", name: "Main Campus", schoolId: "school-eduflow", city: "Karachi", address: "Shahrah-e-Faisal, Karachi", phone: "+92 21 3456 7890", email: "main@eduflow.edu.pk", status: "active" },
  { id: "clifton", name: "Clifton Campus", schoolId: "school-eduflow", city: "Karachi", address: "Block 5, Clifton, Karachi", phone: "+92 21 3456 1234", email: "clifton@eduflow.edu.pk", status: "active" },
  { id: "gulshan", name: "Gulshan Campus", schoolId: "school-horizon", city: "Karachi", address: "Gulshan-e-Iqbal, Karachi", phone: "+92 21 3456 5678", email: "gulshan@eduflow.edu.pk", status: "active" },
];

export function syncCampuses(next: Campus[]) {
  CAMPUSES = next;
}

/**
 * The canonical subject content, keyed by a short stable code — GRADE_SUBJECTS
 * and LAB_SUBJECT_ROOM_NAME below are written against these codes rather than
 * a Subject's own row id, because each school now gets its OWN independent
 * Subject record (see subjectId() below): the code is the one thing that
 * stays stable across schools so the "recipe" data doesn't need to be
 * duplicated per school too.
 */
const SUBJECT_CATALOG: { code: string; name: string }[] = [
  { code: "eng", name: "English" },
  { code: "urdu", name: "Urdu" },
  { code: "math", name: "Mathematics" },
  { code: "sci", name: "Science" },
  { code: "soc", name: "Social Studies" },
  { code: "isl", name: "Islamiyat" },
  { code: "cs", name: "Computer Science" },
  { code: "art", name: "Art & Craft" },
  { code: "pe", name: "Physical Education" },
  { code: "phy", name: "Physics" },
  { code: "chem", name: "Chemistry" },
  { code: "bio", name: "Biology" },
  { code: "addmath", name: "Additional Mathematics" },
];

/** The row id a given school's copy of a catalog subject gets — the one place code→id resolution happens. */
export function subjectId(schoolId: string, code: string): string {
  return `${schoolId}-subj-${code}`;
}

function buildSubjects(): Subject[] {
  const subjects: Subject[] = [];
  for (const school of SCHOOLS) {
    for (const { code, name } of SUBJECT_CATALOG) {
      subjects.push({ id: subjectId(school.id, code), name, code: code.toUpperCase(), schoolId: school.id, status: "active" });
    }
  }
  return subjects;
}

export let SUBJECTS: Subject[] = buildSubjects();

export function syncSubjects(next: Subject[]) {
  SUBJECTS = next;
}

export const GRADE_ORDER = ["Grade 1", "Grade 2", "Grade 5", "Grade 8", "O-Level"];

export function wingForGrade(grade: string): "Primary Wing" | "Middle Wing" | "Senior Wing" {
  if (grade === "Grade 1" || grade === "Grade 2") return "Primary Wing";
  if (grade === "O-Level") return "Senior Wing";
  return "Middle Wing";
}

export const GRADE_SUBJECTS: Record<string, string[]> = {
  "Grade 1": ["eng", "urdu", "math", "sci", "isl", "art"],
  "Grade 2": ["eng", "urdu", "math", "sci", "isl", "art"],
  "Grade 5": ["eng", "urdu", "math", "sci", "soc", "isl", "cs"],
  "Grade 8": ["eng", "urdu", "math", "sci", "soc", "isl", "cs", "pe"],
  "O-Level": ["eng", "urdu", "addmath", "phy", "chem", "bio", "cs"],
};

/** grade + sections offered at each campus, largest campus first */
const CAMPUS_OFFERINGS: Record<string, { grade: string; sections: string[] }[]> = {
  main: [
    { grade: "Grade 1", sections: ["A", "B"] },
    { grade: "Grade 2", sections: ["A", "B"] },
    { grade: "Grade 5", sections: ["A", "B"] },
    { grade: "Grade 8", sections: ["A", "B"] },
    { grade: "O-Level", sections: ["A"] },
  ],
  clifton: [
    { grade: "Grade 1", sections: ["A"] },
    { grade: "Grade 2", sections: ["A"] },
    { grade: "Grade 5", sections: ["A"] },
    { grade: "Grade 8", sections: ["A"] },
  ],
  gulshan: [
    { grade: "Grade 1", sections: ["A"] },
    { grade: "Grade 5", sections: ["A"] },
    { grade: "O-Level", sections: ["A"] },
  ],
};

function buildClassesWithoutTeacher(): Omit<ClassSection, "classTeacherId">[] {
  const classes: Omit<ClassSection, "classTeacherId">[] = [];
  for (const campus of CAMPUSES) {
    const offerings = CAMPUS_OFFERINGS[campus.id] ?? [];
    for (const offering of offerings) {
      for (const section of offering.sections) {
        classes.push({
          id: `${campus.id}-${offering.grade.replace(/\s+/g, "").toLowerCase()}-${section.toLowerCase()}`,
          grade: offering.grade,
          section,
          campusId: campus.id,
          subjectIds: GRADE_SUBJECTS[offering.grade].map((code) => subjectId(campus.schoolId, code)),
          studentCapacity: offering.grade === "O-Level" ? 25 : 35,
          status: "active",
        });
      }
    }
  }
  return classes;
}

const rand = mulberry32(7);

function buildTeachersAndAssignClassTeachers() {
  const baseClasses = buildClassesWithoutTeacher();
  const teachers: Teacher[] = [];
  const teacherIdBySubjectByCampus: Record<string, Record<string, string>> = {};
  let seq = 1;

  for (const campus of CAMPUSES) {
    teacherIdBySubjectByCampus[campus.id] = {};
    const subjectsAtCampus = new Set<string>();
    baseClasses.filter((c) => c.campusId === campus.id).forEach((c) => c.subjectIds.forEach((s) => subjectsAtCampus.add(s)));

    for (const subjId of subjectsAtCampus) {
      const gender = rand() > 0.45 ? "female" : "male";
      const name = fullName(gender, rand);
      const id = `t${seq++}`;
      const employeeId = `EDU-T${String(seq).padStart(4, "0")}`;
      teachers.push({
        id,
        name,
        employeeId,
        campusId: campus.id,
        subjectIds: [subjId],
        classIds: [],
        phone: phoneNumber(rand),
        email: emailFrom(name, "eduflow.edu.pk"),
        qualification: pick(["B.Ed", "M.Ed", "MSc", "MPhil", "BS Education"], rand),
        joinDate: `20${intBetween(15, 25, rand)}-0${intBetween(1, 8, rand)}-1${intBetween(0, 5, rand)}`,
        status: "active",
      });
      teacherIdBySubjectByCampus[campus.id][subjId] = id;
    }
  }

  const classes: ClassSection[] = baseClasses.map((c) => {
    const primarySubject = c.subjectIds[0];
    const classTeacherId = teacherIdBySubjectByCampus[c.campusId][primarySubject];
    return { ...c, classTeacherId };
  });

  for (const teacher of teachers) {
    teacher.classIds = classes
      .filter((c) => c.campusId === teacher.campusId && c.subjectIds.some((s) => teacher.subjectIds.includes(s)))
      .map((c) => c.id);
  }

  return { classes, teachers };
}

const seeded = buildTeachersAndAssignClassTeachers();
export let CLASSES: ClassSection[] = seeded.classes;
export let TEACHERS: Teacher[] = seeded.teachers;

export function syncClasses(next: ClassSection[]) {
  CLASSES = next;
}

export function syncTeachers(next: Teacher[]) {
  TEACHERS = next;
}

/** Subjects taught in a dedicated specialist room rather than a class's home room. */
const LAB_SUBJECT_ROOM_NAME: Record<string, string> = {
  sci: "Science Lab",
  phy: "Physics Lab",
  chem: "Chemistry Lab",
  bio: "Biology Lab",
  cs: "Computer Lab",
  art: "Art Studio",
  pe: "Gymnasium",
};

function buildRooms(): Room[] {
  const rooms: Room[] = [];
  for (const campus of CAMPUSES) {
    const classesAtCampus = CLASSES.filter((c) => c.campusId === campus.id);
    classesAtCampus.forEach((c, i) => {
      rooms.push({
        id: `${campus.id}-room-${101 + i}`,
        name: `Room ${101 + i}`,
        campusId: campus.id,
        type: "classroom",
        capacity: c.studentCapacity + 5,
        status: "active",
      });
    });
    const subjectsAtCampus = new Set(classesAtCampus.flatMap((c) => c.subjectIds));
    for (const [code, roomName] of Object.entries(LAB_SUBJECT_ROOM_NAME)) {
      if (!subjectsAtCampus.has(subjectId(campus.schoolId, code))) continue;
      rooms.push({
        id: `${campus.id}-${code}-room`,
        name: roomName,
        campusId: campus.id,
        type: roomName === "Gymnasium" ? "hall" : code === "art" ? "other" : "lab",
        capacity: roomName === "Gymnasium" ? 100 : 30,
        status: "active",
      });
    }
  }
  return rooms;
}

export let ROOMS: Room[] = buildRooms();

export function syncRooms(next: Room[]) {
  ROOMS = next;
}

/** Every class's "home room" — where it sits for non-specialist periods — is its campus's first general classroom, offset by the class's own index at that campus so classes don't collide. */
export function homeRoomFor(classId: string): Room | undefined {
  const cls = CLASSES.find((c) => c.id === classId);
  if (!cls) return undefined;
  const classesAtCampus = CLASSES.filter((c) => c.campusId === cls.campusId);
  const index = classesAtCampus.findIndex((c) => c.id === classId);
  const generalRooms = ROOMS.filter((r) => r.campusId === cls.campusId && r.type === "classroom");
  return generalRooms[index] ?? generalRooms[0];
}

/** The dedicated specialist room for a subject at a class's campus, if that subject uses one. */
export function labRoomFor(classId: string, subjectIdValue: string): Room | undefined {
  const cls = CLASSES.find((c) => c.id === classId);
  const code = SUBJECTS.find((s) => s.id === subjectIdValue)?.code?.toLowerCase();
  if (!cls || !code || !(code in LAB_SUBJECT_ROOM_NAME)) return undefined;
  return ROOMS.find((r) => r.campusId === cls.campusId && r.id === `${cls.campusId}-${code}-room`);
}

export function roomName(id: string | undefined) {
  if (!id) return "—";
  return ROOMS.find((r) => r.id === id)?.name ?? "—";
}

export function subjectName(id: string) {
  return SUBJECTS.find((s) => s.id === id)?.name ?? id;
}

export function classLabel(classOrId: ClassSection | string) {
  const cls = typeof classOrId === "string" ? CLASSES.find((c) => c.id === classOrId) : classOrId;
  return cls ? `${cls.grade}-${cls.section}` : "—";
}

export function campusName(id: string) {
  return CAMPUSES.find((c) => c.id === id)?.name ?? id;
}

export function teacherName(id: string) {
  return TEACHERS.find((t) => t.id === id)?.name ?? "Unassigned";
}
