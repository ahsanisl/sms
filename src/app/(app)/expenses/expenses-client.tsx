"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, Download, MoreVertical, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { BillForm, PayBillForm, type BillFormValues } from "@/components/expenses/bill-forms";
import {
  createBillAction,
  createCategoryAction,
  createExpenseAction,
  deleteExpenseAction,
  payBillAction,
  removeReceiptAction,
  renameCategoryAction,
  reviewExpenseAction,
  setBillArchivedAction,
  setCategoryArchivedAction,
  updateBillAction,
  updateExpenseAction,
} from "@/app/(app)/expenses/actions";
import {
  BILL_FREQUENCY_LABEL,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
  type BillFrequency,
  type ExpenseStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { billDueState, currentMonthKey, daysBetween, monthKeyLabel, monthKeyOf, todayIso } from "@/lib/finance";
import { formatCompactPKR, formatDate, formatPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";

export interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  payee: string;
  description: string;
  method: PaymentMethod;
  reference: string;
  status: ExpenseStatus;
  categoryId: string;
  categoryName: string;
  campusId: string;
  campusName: string;
  isBillPayment: boolean;
  submittedByName: string;
  reviewedByName?: string;
  reviewNote?: string;
  canEdit: boolean;
  receipts: { id: string; fileName: string }[];
}

export interface BillRow {
  id: string;
  name: string;
  payee: string;
  amount: number;
  frequency: BillFrequency;
  nextDueDate: string;
  notes: string;
  status: "active" | "archived";
  categoryId: string;
  categoryName: string;
  campusId: string;
  campusName: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  status: "active" | "archived";
  expenseCount: number;
  billCount: number;
}

interface ExpensesClientProps {
  initialTab: "expenses" | "bills" | "categories";
  expenses: ExpenseRow[];
  bills: BillRow[];
  categories: CategoryRow[];
  campuses: { id: string; name: string }[];
  allowSchoolWide: boolean;
  canApprove: boolean;
  scopeLabel: string;
  listMonths: number;
}

const PENDING_NOTE = "This will be sent for approval. It counts in totals once an approver accepts it.";

function expenseTitle(e: Pick<ExpenseRow, "payee" | "description">) {
  return e.payee || e.description || "Expense";
}

export function ExpensesClient(props: ExpensesClientProps) {
  const { expenses, bills, categories, campuses, allowSchoolWide, canApprove, scopeLabel } = props;
  const router = useLoadingRouter();
  const [tab, setTab] = useState(props.initialTab);
  const [isPending, startTransition] = useTransition();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [rejecting, setRejecting] = useState<ExpenseRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const activeCategories = categories.filter((c) => c.status === "active");
  const formOptions = { categories: activeCategories, campuses, allowSchoolWide };

  // -- Summary --------------------------------------------------------
  const thisMonth = currentMonthKey();
  const today = todayIso();
  const approvedThisMonth = expenses.filter((e) => e.status === "approved" && monthKeyOf(e.date) === thisMonth);
  const spentThisMonth = approvedThisMonth.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => e.status === "pending");
  const activeBills = bills.filter((b) => b.status === "active");
  const overdueBills = activeBills.filter((b) => billDueState(b.nextDueDate, today) === "overdue");
  const dueSoonBills = activeBills.filter((b) => billDueState(b.nextDueDate, today) === "due_soon");
  const categoryTotals = new Map<string, number>();
  for (const e of approvedThisMonth) categoryTotals.set(e.categoryName, (categoryTotals.get(e.categoryName) ?? 0) + e.amount);
  const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  // -- Actions --------------------------------------------------------
  async function submit(action: () => Promise<{ success: boolean; error?: string }>, successMessage: string, after?: () => void) {
    const result = await action();
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    toast.success(successMessage);
    after?.();
    router.refresh();
    return true;
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await submit(() => createExpenseAction(formData), canApprove ? "Expense recorded." : "Expense sent for approval.", () => setAddOpen(false));
    });
  }

  function handleUpdate(formData: FormData) {
    if (!editing) return;
    const wasRejected = editing.status === "rejected";
    startTransition(async () => {
      await submit(() => updateExpenseAction(editing.id, formData), wasRejected && !canApprove ? "Expense resubmitted for approval." : "Expense updated.", () => setEditing(null));
    });
  }

  function handleReview(expense: ExpenseRow, status: "approved" | "rejected", note?: string) {
    startTransition(async () => {
      await submit(() => reviewExpenseAction(expense.id, status, note), status === "approved" ? `Approved ${formatPKR(expense.amount)} — ${expenseTitle(expense)}.` : "Expense rejected.", () => {
        setRejecting(null);
        setRejectNote("");
      });
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      await submit(() => deleteExpenseAction(deleting.id), "Expense deleted.", () => setDeleting(null));
    });
  }

  function handleRemoveReceipt(attachmentId: string) {
    startTransition(async () => {
      const ok = await submit(() => removeReceiptAction(attachmentId), "Receipt removed.");
      if (ok && editing) setEditing({ ...editing, receipts: editing.receipts.filter((r) => r.id !== attachmentId) });
    });
  }

  function exportCsv() {
    downloadCsv(
      `expenses-${today}.csv`,
      ["Date", "Paid to", "Description", "Category", "Campus", "Amount (Rs.)", "Paid by", "Reference", "Status", "Recorded by", "Reviewed by"],
      expenses.map((e) => [e.date, e.payee, e.description, e.categoryName, e.campusName, e.amount, PAYMENT_METHOD_LABEL[e.method], e.reference, EXPENSE_STATUS_LABEL[e.status], e.submittedByName, e.reviewedByName ?? ""]),
    );
  }

  // -- Table --------------------------------------------------------
  const months = [...new Set(expenses.map((e) => monthKeyOf(e.date)))].sort().reverse();
  const columns: Column<ExpenseRow>[] = [
    { key: "date", header: "Date", sortable: true, accessor: (e) => e.date, render: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span> },
    {
      key: "what",
      header: "Expense",
      sortable: true,
      accessor: (e) => expenseTitle(e),
      render: (e) => (
        <div className="min-w-0 max-w-[22rem]">
          <p className="truncate font-medium text-on-surface" title={expenseTitle(e)}>
            {expenseTitle(e)}
            {e.isBillPayment && <span className="ml-2 align-middle text-label-sm font-normal text-on-surface-variant">· Bill</span>}
          </p>
          <p className="truncate text-label-sm text-on-surface-variant" title={e.payee && e.description ? e.description : undefined}>
            {e.categoryName}
            {e.payee && e.description ? ` · ${e.description}` : ""}
          </p>
        </div>
      ),
    },
    { key: "campus", header: "Campus", sortable: true, accessor: (e) => e.campusName, render: (e) => <span className="whitespace-nowrap text-on-surface-variant">{e.campusName}</span> },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      accessor: (e) => e.amount,
      className: "text-right",
      render: (e) => <span className="whitespace-nowrap font-semibold tabular-nums text-on-surface">{formatPKR(e.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (e) => e.status,
      render: (e) => (
        <div title={e.reviewNote ? `Note: ${e.reviewNote}` : e.reviewedByName ? `By ${e.reviewedByName}` : `Recorded by ${e.submittedByName}`}>
          <StatusBadge label={e.status === "pending" ? "Pending" : EXPENSE_STATUS_LABEL[e.status]} tone={EXPENSE_STATUS_TONE[e.status]} />
        </div>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      render: (e) =>
        e.receipts.length ? (
          <a href={`/api/files/${e.receipts[0].id}`} className="inline-flex items-center gap-1 text-label-md font-semibold text-secondary hover:underline" title={e.receipts.map((r) => r.fileName).join(", ")}>
            <Paperclip size={14} aria-hidden />
            {e.receipts.length > 1 ? `${e.receipts.length} files` : "View"}
          </a>
        ) : (
          <span className="text-label-sm text-on-surface-variant">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`Spending and recurring bills for ${scopeLabel.toLowerCase() === "all campuses" ? "the whole school" : scopeLabel}.`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={exportCsv} disabled={expenses.length === 0}>
              <Download /> Export
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={activeCategories.length === 0}>
              <Plus /> Record Expense
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Spent in ${monthKeyLabel(thisMonth).split(" ")[0]}`} value={formatCompactPKR(spentThisMonth)} icon="receipt" trend={{ direction: "flat", label: `${approvedThisMonth.length} approved expense${approvedThisMonth.length === 1 ? "" : "s"}` }} />
        <StatCard
          label="Awaiting approval"
          value={String(pending.length)}
          icon="pending_actions"
          tone={pending.length ? "warning" : "default"}
          trend={pending.length ? { direction: "flat", label: `${formatCompactPKR(pending.reduce((s, e) => s + e.amount, 0))} in total` } : undefined}
        />
        <StatCard
          label="Bills due"
          value={String(overdueBills.length + dueSoonBills.length)}
          icon="bolt"
          tone={overdueBills.length ? "error" : dueSoonBills.length ? "warning" : "default"}
          trend={{ direction: overdueBills.length ? "down" : "flat", label: overdueBills.length ? `${overdueBills.length} overdue` : "in the next 7 days" }}
        />
        <StatCard label="Top category this month" value={topCategory ? topCategory[0] : "—"} icon="category" trend={topCategory ? { direction: "flat", label: formatCompactPKR(topCategory[1]) } : undefined} />
      </div>

      {canApprove && pending.length > 0 && (
        <Card className="mb-5 border-warning/30">
          <CardHeader title="Waiting for your approval" description={`${pending.length} expense${pending.length === 1 ? "" : "s"} recorded by staff. Approved expenses count in totals and reports.`} className="pt-md" />
          <CardContent className="pt-sm">
            <ul className="divide-y divide-outline-variant/40">
              {pending.slice(0, 6).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-on-surface">
                      {expenseTitle(e)} <span className="font-semibold tabular-nums">· {formatPKR(e.amount)}</span>
                    </p>
                    <p className="truncate text-label-sm text-on-surface-variant">
                      {e.categoryName} · {e.campusName} · {formatDate(e.date)} · by {e.submittedByName}
                      {e.receipts.length > 0 && (
                        <>
                          {" · "}
                          <a href={`/api/files/${e.receipts[0].id}`} className="font-semibold text-secondary hover:underline">receipt</a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setRejecting(e)}>
                      <X /> Reject
                    </Button>
                    <Button size="sm" disabled={isPending} onClick={() => handleReview(e, "approved")}>
                      <Check /> Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {pending.length > 6 && <p className="pt-2 text-label-md text-on-surface-variant">+ {pending.length - 6} more in the list below (filter by status “Pending approval”).</p>}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="bills">
            Recurring Bills ({activeBills.length})
            {overdueBills.length > 0 && <span className="ml-1.5 rounded-full bg-error px-1.5 text-[10px] font-bold text-on-error">{overdueBills.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="categories">Categories ({activeCategories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="pt-4">
          <Card>
            <DataTable
              columns={columns}
              data={expenses}
              rowKey={(e) => e.id}
              searchPlaceholder="Search by payee, description or reference…"
              searchKeys={(e) => [e.payee, e.description, e.reference, e.categoryName]}
              filters={[
                { key: "status", label: "Status", options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: EXPENSE_STATUS_LABEL[s] })) },
                { key: "category", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })) },
                ...(campuses.length > 1 || allowSchoolWide
                  ? [{ key: "campus", label: "Campus", options: [...(allowSchoolWide ? [{ value: "school", label: "Whole school" }] : []), ...campuses.map((c) => ({ value: c.id, label: c.name }))] }]
                  : []),
                { key: "month", label: "Month", options: months.map((m) => ({ value: m, label: monthKeyLabel(m) })) },
              ]}
              filterFn={(e, v) =>
                (!v.status || e.status === v.status) &&
                (!v.category || e.categoryId === v.category) &&
                (!v.campus || (v.campus === "school" ? e.campusId === "" : e.campusId === v.campus)) &&
                (!v.month || monthKeyOf(e.date) === v.month)
              }
              pageSize={15}
              emptyTitle="No expenses yet"
              emptyDescription={`Expenses from the last ${props.listMonths} months appear here. Record one with “Record Expense”.`}
              rowActions={(e) => (
                <ExpenseRowActions
                  expense={e}
                  canApprove={canApprove}
                  busy={isPending}
                  onApprove={() => handleReview(e, "approved")}
                  onReject={() => setRejecting(e)}
                  onEdit={() => setEditing(e)}
                  onDelete={() => setDeleting(e)}
                />
              )}
            />
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="pt-4">
          <BillsTab bills={bills} formOptions={formOptions} canApprove={canApprove} onDone={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          <CategoriesTab categories={categories} canManage={allowSchoolWide} onDone={() => router.refresh()} />
        </TabsContent>
      </Tabs>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Record Expense" className="max-w-[40rem]">
        <ExpenseForm {...formOptions} approvalNote={canApprove ? undefined : PENDING_NOTE} submitLabel={canApprove ? "Save Expense" : "Submit for Approval"} submitting={isPending} onSubmit={handleCreate} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Expense" className="max-w-[40rem]">
        {editing && (
          <ExpenseForm
            {...formOptions}
            categories={activeCategories.some((c) => c.id === editing.categoryId) ? activeCategories : [...activeCategories, { id: editing.categoryId, name: editing.categoryName }]}
            initialValues={{ ...editing, amount: String(editing.amount) }}
            existingReceipts={editing.receipts}
            onRemoveReceipt={handleRemoveReceipt}
            approvalNote={editing.status === "rejected" && !canApprove ? `Rejected${editing.reviewNote ? `: “${editing.reviewNote}”` : ""}. Saving sends it for approval again.` : undefined}
            submitLabel={editing.status === "rejected" && !canApprove ? "Resubmit" : "Save Changes"}
            submitting={isPending}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!rejecting}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNote("");
          }
        }}
        title="Reject Expense"
        description={rejecting ? `${expenseTitle(rejecting)} · ${formatPKR(rejecting.amount)} · recorded by ${rejecting.submittedByName}` : undefined}
        className="max-w-[28rem]"
      >
        <div className="space-y-4">
          <FormField label="Reason (shown to the person who recorded it)" htmlFor="reject-note">
            <Textarea id="reject-note" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. Please attach the receipt" autoFocus />
          </FormField>
          <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={() => rejecting && handleReview(rejecting, "rejected", rejectNote)}>
              Reject Expense
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this expense?"
        description={deleting ? `${expenseTitle(deleting)} · ${formatPKR(deleting.amount)} on ${formatDate(deleting.date)}. Its receipt is deleted too. This is recorded in the Audit Log.` : undefined}
        confirmLabel="Delete Expense"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ExpenseRowActions({
  expense,
  canApprove,
  busy,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: {
  expense: ExpenseRow;
  canApprove: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const reviewable = canApprove && expense.status === "pending";
  if (!reviewable && !expense.canEdit) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {reviewable && (
        <>
          <button disabled={busy} title="Approve" aria-label={`Approve ${expenseTitle(expense)}`} onClick={onApprove} className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-success-container/50 hover:text-success disabled:opacity-50">
            <Check size={16} />
          </button>
          <button disabled={busy} title="Reject" aria-label={`Reject ${expenseTitle(expense)}`} onClick={onReject} className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error disabled:opacity-50">
            <X size={16} />
          </button>
        </>
      )}
      {expense.canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary" aria-label={`More actions for ${expenseTitle(expense)}`}>
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil size={14} /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// -- Recurring bills --------------------------------------------------------
function dueLabel(nextDueDate: string, today: string) {
  const days = daysBetween(today, nextDueDate);
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function BillsTab({
  bills,
  formOptions,
  canApprove,
  onDone,
}: {
  bills: BillRow[];
  formOptions: { categories: { id: string; name: string }[]; campuses: { id: string; name: string }[]; allowSchoolWide: boolean };
  canApprove: boolean;
  onDone: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BillRow | null>(null);
  const [paying, setPaying] = useState<BillRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = todayIso();
  const visible = bills.filter((b) => (showArchived ? b.status === "archived" : b.status === "active"));
  const archivedCount = bills.filter((b) => b.status === "archived").length;

  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string, after: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      after();
      onDone();
    });
  }

  function toInput(values: BillFormValues) {
    return { ...values, amount: Number(values.amount) };
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-md text-on-surface-variant">Rent, utilities and other costs that repeat. Record each payment here and the next due date moves on automatically.</p>
        <div className="flex gap-2">
          {archivedCount > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Show active bills" : `Archived (${archivedCount})`}
            </Button>
          )}
          <Button size="sm" onClick={() => setAdding(true)} disabled={formOptions.categories.length === 0}>
            <Plus /> Add Bill
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="bolt"
            title={showArchived ? "No archived bills" : "No recurring bills yet"}
            description={showArchived ? undefined : "Add rent, electricity, gas, internet and other regular bills to get reminders before they're due."}
            actionLabel={showArchived ? undefined : "Add Bill"}
            onAction={showArchived ? undefined : () => setAdding(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((bill) => {
            const state = billDueState(bill.nextDueDate, today);
            return (
              <Card key={bill.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface" title={bill.name}>{bill.name}</p>
                    <p className="truncate text-label-sm text-on-surface-variant">
                      {bill.categoryName} · {bill.campusName}
                      {bill.payee ? ` · ${bill.payee}` : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="-mr-1 rounded p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" aria-label={`More actions for ${bill.name}`}>
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(bill)}>
                        <Pencil size={14} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => run(() => setBillArchivedAction(bill.id, bill.status === "active"), bill.status === "active" ? "Bill archived." : "Bill restored.", () => undefined)}>
                        {bill.status === "active" ? <Archive size={14} /> : <ArchiveRestore size={14} />} {bill.status === "active" ? "Archive" : "Restore"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mb-3 mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-headline-sm font-semibold tabular-nums text-primary">{formatPKR(bill.amount)}</p>
                    <p className="text-label-sm text-on-surface-variant">{BILL_FREQUENCY_LABEL[bill.frequency]} · next {formatDate(bill.nextDueDate)}</p>
                  </div>
                  {bill.status === "active" && (
                    <StatusBadge label={dueLabel(bill.nextDueDate, today)} tone={state === "overdue" ? "error" : state === "due_soon" ? "warning" : "neutral"} />
                  )}
                </div>
                {bill.notes && <p className="-mt-1 mb-3 line-clamp-2 text-label-sm text-on-surface-variant" title={bill.notes}>{bill.notes}</p>}
                {bill.status === "active" && (
                  <Button size="sm" variant={state === "upcoming" ? "secondary" : "primary"} className="mt-auto self-start" onClick={() => setPaying(bill)}>
                    Record Payment
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={adding} onOpenChange={setAdding} title="Add Recurring Bill" className="max-w-[40rem]">
        <BillForm {...formOptions} submitting={isPending} onCancel={() => setAdding(false)} onSubmit={(values) => run(() => createBillAction(toInput(values)), "Bill added.", () => setAdding(false))} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Bill" className="max-w-[40rem]">
        {editing && (
          <BillForm
            {...formOptions}
            categories={formOptions.categories.some((c) => c.id === editing.categoryId) ? formOptions.categories : [...formOptions.categories, { id: editing.categoryId, name: editing.categoryName }]}
            initialValues={{ ...editing, amount: String(editing.amount) }}
            submitting={isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => run(() => updateBillAction(editing.id, toInput(values)), "Bill updated.", () => setEditing(null))}
          />
        )}
      </Modal>

      <Modal open={!!paying} onOpenChange={(open) => !open && setPaying(null)} title={paying ? `Pay: ${paying.name}` : "Pay Bill"} description={paying ? `Due ${formatDate(paying.nextDueDate)}` : undefined} className="max-w-[36rem]">
        {paying && (
          <PayBillForm
            bill={paying}
            approvalNote={canApprove ? undefined : PENDING_NOTE}
            submitting={isPending}
            onCancel={() => setPaying(null)}
            onSubmit={(formData) => run(() => payBillAction(paying.id, formData), canApprove ? "Payment recorded." : "Payment recorded and sent for approval.", () => setPaying(null))}
          />
        )}
      </Modal>
    </>
  );
}

// -- Categories --------------------------------------------------------
/** canManage: categories are shared by every campus, so campus-limited roles only view them. */
function CategoriesTab({ categories, canManage, onDone }: { categories: CategoryRow[]; canManage: boolean; onDone: () => void }) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<CategoryRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string, after: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      after();
      onDone();
    });
  }

  const sorted = [...categories].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "active" ? -1 : 1));

  return (
    <Card>
      <CardHeader
        title="Expense categories"
        description={canManage ? "Used to group spending in totals and reports. Archive one to hide it from new expenses; past entries keep it." : "Shared by every campus. Ask the school office to add or rename a category."}
      />
      <CardContent>
        {canManage && (
          <form
            className="mb-4 flex max-w-[28rem] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              run(() => createCategoryAction(newName.trim()), `“${newName.trim()}” added.`, () => setNewName(""));
            }}
          >
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category, e.g. Sports Equipment" aria-label="New category name" />
            <Button type="submit" size="sm" className="h-auto" disabled={isPending || !newName.trim()}>
              <Plus /> Add
            </Button>
          </form>
        )}
        <ul className="divide-y divide-outline-variant/40 rounded-lg border border-outline-variant/60">
          {sorted.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className={c.status === "archived" ? "text-on-surface-variant line-through" : "font-medium text-on-surface"}>{c.name}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {c.expenseCount} expense{c.expenseCount === 1 ? "" : "s"} in the last year{c.billCount ? ` · ${c.billCount} bill${c.billCount === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              {c.status === "archived" && <StatusBadge label="Archived" />}
              {canManage && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenaming(c);
                      setRenameValue(c.name);
                    }}
                  >
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run(() => setCategoryArchivedAction(c.id, c.status === "active"), c.status === "active" ? `“${c.name}” archived.` : `“${c.name}” restored.`, () => undefined)}>
                    {c.status === "active" ? "Archive" : "Restore"}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <Modal open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)} title="Rename Category" className="max-w-[24rem]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!renaming || !renameValue.trim()) return;
            run(() => renameCategoryAction(renaming.id, renameValue.trim()), "Category renamed.", () => setRenaming(null));
          }}
        >
          <FormField label="Name" htmlFor="rename-category" required>
            <Input id="rename-category" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          </FormField>
          <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !renameValue.trim()}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
