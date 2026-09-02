import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { CollectFeeClient } from "@/app/(app)/fees/collect/collect-client";

export default async function CollectFeePage() {
  const session = await requireSession();
  const [classes, students] = await Promise.all([classService.listClasses(session), studentService.listStudents(session)]);
  const activeStudents = students.filter((s) => s.status === "active").map((s) => ({ ...s, dob: s.dob ?? "", admissionDate: s.admissionDate ?? "" }));
  const invoices = await feeService.listInvoicesForStudents(session, activeStudents.map((s) => s.id));

  return <CollectFeeClient students={activeStudents} classes={classes} invoices={invoices} />;
}
