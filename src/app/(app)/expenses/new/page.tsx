import * as expenseService from "@/services/expense.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { NewExpenseClient } from "@/app/(app)/expenses/new/new-expense-client";

export default async function NewExpensePage() {
  const session = await requireSession();
  const [categories, campuses, canApprove] = await Promise.all([
    expenseService.listCategories(session),
    campusService.listCampuses(session),
    can(session, "expensesApprove"),
  ]);
  return (
    <NewExpenseClient
      categories={categories.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))}
      campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
      allowSchoolWide={session.role !== "campus_admin"}
      canApprove={canApprove}
    />
  );
}
