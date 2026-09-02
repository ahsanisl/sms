/** Pure percentage→letter-grade lookup, given a school's own grade bands — the real-data equivalent of lib/mock/exams.ts's grade(), which reads the mock store's global GRADE_SCALE instead. */
export function gradeFor(percentage: number, bands: { grade: string; minPercentage: number }[]): string {
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);
  return sorted.find((band) => percentage >= band.minPercentage)?.grade ?? "F";
}
