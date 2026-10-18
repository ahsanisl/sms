/** Pure percentage→letter-grade lookup, given a school's own grade bands (highest matching minimum wins; "F" if none). */
export function gradeFor(percentage: number, bands: { grade: string; minPercentage: number }[]): string {
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);
  return sorted.find((band) => percentage >= band.minPercentage)?.grade ?? "F";
}
