/** Percentage of records marked present or late (late still counts as attending), rounded; 0 when there are no records. */
export function attendanceRate(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((present / records.length) * 100);
}
