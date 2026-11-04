import * as payrollService from "@/services/payroll.service";
import * as schoolService from "@/services/school.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { PayslipClient } from "@/app/(app)/payroll/payslips/[payslipId]/payslip-client";

export default async function PayslipPage({ params }: { params: Promise<{ payslipId: string }> }) {
  const [session, { payslipId }] = await Promise.all([requireSession(), params]);
  const [{ payslip, month, runStatus }, school, campuses, profiles] = await Promise.all([
    payrollService.getPayslip(session, payslipId),
    schoolService.getMySchool(session),
    campusService.listCampuses(session),
    payrollService.listProfiles(session),
  ]);
  return (
    <PayslipClient
      school={{ name: school.name, address: school.address, logoEmoji: school.logoEmoji }}
      month={month}
      runId={payslip.runId}
      runStatus={runStatus}
      campusName={payslip.campusId ? (campuses.find((c) => c.id === payslip.campusId)?.name ?? "") : ""}
      bankAccount={profiles.find((p) => p.id === payslip.profileId)?.bankAccount ?? ""}
      payslip={{
        name: payslip.name,
        designation: payslip.designation,
        basicSalary: payslip.basicSalary,
        allowances: payslip.allowances,
        bonus: payslip.bonus,
        fixedDeductions: payslip.fixedDeductions,
        unpaidLeaveDays: payslip.unpaidLeaveDays,
        leaveDeduction: payslip.leaveDeduction,
        otherDeduction: payslip.otherDeduction,
        netPay: payslip.netPay,
        note: payslip.note,
        status: payslip.status,
        paidDate: payslip.paidDate ?? undefined,
        method: payslip.method ?? undefined,
        reference: payslip.reference ?? undefined,
      }}
    />
  );
}
