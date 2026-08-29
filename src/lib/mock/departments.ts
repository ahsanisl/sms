import type { Department } from "@/lib/types";
import { CAMPUSES, CLASSES, TEACHERS } from "@/lib/mock/reference-data";

/** Canonical department groupings — a campus only gets a department if it actually teaches at least one of these subjects. */
const DEPARTMENT_GROUPS: { name: string; subjectIds: string[] }[] = [
  { name: "Languages Department", subjectIds: ["eng", "urdu"] },
  { name: "Mathematics Department", subjectIds: ["math", "addmath"] },
  { name: "Science Department", subjectIds: ["sci", "phy", "chem", "bio"] },
  { name: "Social Studies & Islamiyat Department", subjectIds: ["soc", "isl"] },
  { name: "Computer Science Department", subjectIds: ["cs"] },
  { name: "Arts & Physical Education Department", subjectIds: ["art", "pe"] },
];

function buildDepartments(): Department[] {
  const departments: Department[] = [];
  let seq = 1;

  for (const campus of CAMPUSES) {
    const subjectsAtCampus = new Set(CLASSES.filter((c) => c.campusId === campus.id).flatMap((c) => c.subjectIds));

    for (const group of DEPARTMENT_GROUPS) {
      const subjectIds = group.subjectIds.filter((s) => subjectsAtCampus.has(s));
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
