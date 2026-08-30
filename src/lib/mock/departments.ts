import type { Department } from "@/lib/types";
import { CAMPUSES, CLASSES, TEACHERS, subjectId } from "@/lib/mock/reference-data";

/** Canonical department groupings, keyed by the stable subject code (see reference-data.ts's SUBJECT_CATALOG) rather than a row id, since each school has its own independent Subject records. A campus only gets a department if it actually teaches at least one of these subjects. */
const DEPARTMENT_GROUPS: { name: string; subjectCodes: string[] }[] = [
  { name: "Languages Department", subjectCodes: ["eng", "urdu"] },
  { name: "Mathematics Department", subjectCodes: ["math", "addmath"] },
  { name: "Science Department", subjectCodes: ["sci", "phy", "chem", "bio"] },
  { name: "Social Studies & Islamiyat Department", subjectCodes: ["soc", "isl"] },
  { name: "Computer Science Department", subjectCodes: ["cs"] },
  { name: "Arts & Physical Education Department", subjectCodes: ["art", "pe"] },
];

function buildDepartments(): Department[] {
  const departments: Department[] = [];
  let seq = 1;

  for (const campus of CAMPUSES) {
    const subjectsAtCampus = new Set(CLASSES.filter((c) => c.campusId === campus.id).flatMap((c) => c.subjectIds));

    for (const group of DEPARTMENT_GROUPS) {
      const subjectIds = group.subjectCodes.map((code) => subjectId(campus.schoolId, code)).filter((sid) => subjectsAtCampus.has(sid));
      if (subjectIds.length === 0) continue;

      const head = TEACHERS.find((t) => t.campusId === campus.id && t.subjectIds.some((s) => subjectIds.includes(s)));

      departments.push({
        id: `dept${seq++}`,
        name: group.name,
        campusId: campus.id,
        subjectIds,
        headTeacherId: head?.id,
        status: "active",
      });
    }
  }
  return departments;
}

// Mutable — see the render-body mirror-sync comment in lib/store/app-data-context.tsx.
export let DEPARTMENTS: Department[] = buildDepartments();

export function syncDepartments(next: Department[]) {
  DEPARTMENTS = next;
}
