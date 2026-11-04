import * as financeService from "@/services/finance.service";
import { requireSession } from "@/lib/tenancy";
import { getViewCampusId } from "@/services/scope";
import { currentMonthKey } from "@/lib/finance";
import { FinanceClient } from "@/app/(app)/finance/finance-client";

const RANGES = [6, 12] as const;

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const monthCount = RANGES.find((r) => String(r) === params.months) ?? 6;
  const [report, viewCampusId] = await Promise.all([
    financeService.getIncomeExpenseReport(session, currentMonthKey(), monthCount, { inView: true }),
    getViewCampusId(session),
  ]);
  const scopeLabel = viewCampusId ? (report.campuses.find((c) => c.id === viewCampusId)?.name ?? "This campus") : session.role === "campus_admin" ? (report.campuses[0]?.name ?? "Your campus") : "All campuses";
  return <FinanceClient report={report} monthCount={monthCount} ranges={[...RANGES]} scopeLabel={scopeLabel} />;
}
