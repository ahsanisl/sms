import * as examService from "@/services/exam.service";
import { requireSession } from "@/lib/tenancy";
import { GradeScaleClient } from "@/app/(app)/settings/grade-scale/grade-scale-client";

export default async function GradeScalePage() {
  const session = await requireSession();
  const bands = await examService.listGradeBands(session);

  return <GradeScaleClient bands={bands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))} />;
}
