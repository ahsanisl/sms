import { DEFAULT_WORKING_DAYS } from "@/lib/constants";
import { countWorkingDays } from "@/lib/finance";

/** "2 working days" (Mon–Fri) for display; payroll itself counts with the school's own working days. */
export function countWorkingDaysLabel(from: string, to: string): string {
  const days = countWorkingDays(from, to, DEFAULT_WORKING_DAYS);
  return `${days} working day${days === 1 ? "" : "s"}`;
}
