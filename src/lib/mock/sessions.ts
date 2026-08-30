import type { AcademicSession } from "@/lib/types";
import { SCHOOLS } from "@/lib/mock/schools";

const SESSION_TEMPLATE: Omit<AcademicSession, "id" | "schoolId">[] = [
  {
    label: "2025 – 2026",
    startDate: "2025-08-01",
    endDate: "2026-06-30",
    terms: [
      { name: "Term 1", startDate: "2025-08-01", endDate: "2025-12-20" },
      { name: "Term 2", startDate: "2026-01-05", endDate: "2026-06-30" },
    ],
    isActive: false,
  },
  {
    label: "2026 – 2027",
    startDate: "2026-08-01",
    endDate: "2027-06-30",
    terms: [
      { name: "Term 1", startDate: "2026-08-01", endDate: "2026-12-18" },
      { name: "Term 2", startDate: "2026-12-08", endDate: "2027-06-30" },
    ],
    isActive: true,
  },
];

function buildSessions(): AcademicSession[] {
  const sessions: AcademicSession[] = [];
  for (const school of SCHOOLS) {
    SESSION_TEMPLATE.forEach((session, i) => sessions.push({ ...session, id: `${school.id}-sess${i + 1}`, schoolId: school.id }));
  }
  return sessions;
}

/** Each school independently has its own "2026 – 2027" session active — a real per-school AcademicSession, not a shared one. */
export const DEFAULT_SESSIONS: AcademicSession[] = buildSessions();

export function activeSession(sessions: AcademicSession[]): AcademicSession | undefined {
  return sessions.find((s) => s.isActive) ?? sessions[sessions.length - 1];
}
