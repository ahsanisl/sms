"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseForm, type ExpenseFormOptions } from "@/components/expenses/expense-form";
import { createExpenseAction } from "@/app/(app)/expenses/actions";

export function NewExpenseClient({ canApprove, ...options }: ExpenseFormOptions & { canApprove: boolean }) {
  const router = useLoadingRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createExpenseAction(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(canApprove ? "Expense recorded." : "Expense sent for approval.");
      router.push("/expenses");
    });
  }

  return (
    <div className="max-w-[44rem]">
      <PageHeader title="Record Expense" description="Log money the school has spent. Attach the receipt if you have one." backHref="/expenses" backLabel="Expenses" />
      <Card>
        <CardContent>
          <ExpenseForm
            {...options}
            approvalNote={canApprove ? undefined : "This will be sent for approval. It counts in totals once an approver accepts it."}
            submitLabel={canApprove ? "Save Expense" : "Submit for Approval"}
            submitting={isPending}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/expenses")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
