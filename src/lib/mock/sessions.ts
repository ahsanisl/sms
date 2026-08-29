import type { AcademicSession } from "@/lib/types";

export const DEFAULT_SESSIONS: AcademicSession[] = [
  {
    id: "sess-2025-26",
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
    id: "sess-2026-27",
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

export function activeSession(sessions: AcademicSession[]): AcademicSession | undefined {
  return sessions.find((s) => s.isActive) ?? sessions[sessions.length - 1];
}
