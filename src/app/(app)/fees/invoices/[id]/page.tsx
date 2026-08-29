"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer, GraduationCap, Tag, Undo2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import { ConcessionForm, type ConcessionFormValues } from "@/components/fees/concession-form";
import { useFeesStore, usePermissions, useStudents } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { classLabel } from "@/lib/mock/reference-data";
import { formatDate, formatPKR } from "@/lib/format";
import type { FeePayment } from "@/lib/types";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { invoices, payments, reversals, applyConcession, reversePayment } = useFeesStore();
  const { students } = useStudents();
  const { user } = useSession();
  const { routePermissions } = usePermissions();

  const [discountOpen, setDiscountOpen] = useState(false);
  const [reversing, setReversing] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <EmptyState
        icon="receipt_long"
        title="Invoice not found"
        description="Go back to Fees & Finances."
        actionLabel="Back to Fees"
        onAction={() => router.push("/fees")}
      />
    );
  }

  const student = students.find((s) => s.id === invoice.studentId);
  const balance = invoice.totalAmount - invoice.paidAmount;
  const tone = invoice.status === "paid" ? "success" : invoice.status === "partial" ? "warning" : "error";
  const canManageFees = !!user && !!routePermissions[user.role]?.feesCollect;
  const invoicePayments = payments.filter((p) => p.invoiceId === invoice.id);

  function handleApplyDiscount(values: ConcessionFormValues) {
    applyConcession(invoice!.id, {
      studentId: invoice!.studentId,
      type: values.type,
      label: values.label,
      amount: values.mode === "amount" ? values.amount : undefined,
      percentage: values.mode === "percentage" ? values.percentage : undefined,
      reason: values.reason,
      approvedBy: values.approvedBy,
      createdAt: new Date().toISOString(),
      status: "active",
    });
    toast.success(`${values.label} applied to invoice ${invoice!.invoiceNo}.`);
    setDiscountOpen(false);
  }

  function handleReverse() {
    if (!reversing || !reversalReason.trim()) {
      toast.error("Please enter a reason for the reversal.");
      return;
    }
    reversePayment({
      paymentId: reversing.id,
      invoiceId: invoice!.id,
      studentId: invoice!.studentId,
      amount: reversing.amount,
      reason: reversalReason,
      date: new Date().toISOString().slice(0, 10),
      reversedBy: user?.name ?? "Staff",
    });
    toast.success(`Payment of ${formatPKR(reversing.amount)} was reversed.`);
    setReversing(null);
    setReversalReason("");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          {canManageFees && (
            <Link href="/fees" className="text-label-md text-secondary hover:underline">← Fees & Finances</Link>
          )}
          <h2 className="text-headline-md font-semibold text-on-surface mt-1">Invoice {invoice.invoiceNo}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </Button>
          {canManageFees && (
            <Button variant="secondary" onClick={() => setDiscountOpen(true)}>
              <Tag size={18} /> Apply Discount
            </Button>
          )}
          {canManageFees && balance > 0 && (
            <Button asChild>
              <Link href={`/fees/collect?studentId=${invoice.studentId}&invoiceId=${invoice.id}`}>Record Payment</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg">
        <div className="flex flex-col md:flex-row justify-between gap-6 pb-lg border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="text-title-lg font-semibold text-on-surface">EduFlow Academy</h3>
              <p className="text-label-sm text-on-surface-variant">Shahrah-e-Faisal, Karachi</p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <StatusBadge label={invoice.status[0].toUpperCase() + invoice.status.slice(1)} tone={tone} />
            <p className="text-label-sm text-on-surface-variant">Invoice No: <span className="text-on-surface font-medium">{invoice.invoiceNo}</span></p>
            <p className="text-label-sm text-on-surface-variant">Issue Date: <span className="text-on-surface font-medium">{formatDate(invoice.issueDate)}</span></p>
            <p className="text-label-sm text-on-surface-variant">Due Date: <span className="text-on-surface font-medium">{formatDate(invoice.dueDate)}</span></p>
          </div>
        </div>

        <div className="py-lg border-b border-outline-variant">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Bill To</p>
          <p className="text-body-lg font-semibold text-on-surface">{student?.name ?? "Unknown Student"}</p>
          <p className="text-body-md text-on-surface-variant">
            {student ? classLabel(student.classId) : ""} · Roll {student?.rollNumber} · Parent: {student?.parentName}
          </p>
        </div>

        <table className="w-full text-left border-collapse my-lg">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wide w-full">Description</th>
              <th className="py-sm px-md text-label-sm text-on-surface-variant uppercase tracking-wide text-right whitespace-nowrap">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {invoice.items.map((item, i) => (
              <tr key={`${item.name}-${i}`}>
                <td className={`py-sm px-md text-body-md ${item.isDiscount ? "text-emerald-700" : "text-on-surface"}`}>{item.name}</td>
                <td className={`py-sm px-md text-body-md text-right ${item.isDiscount ? "text-emerald-700" : "text-on-surface"}`}>
                  {item.isDiscount ? "-" : ""}
                  {Math.abs(item.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col md:flex-row justify-between gap-6">
          <p className="text-body-md text-on-surface-variant text-sm max-w-[24rem] flex-1 min-w-0">
            Please ensure payment is made by the due date to avoid late fees. Reference Invoice {invoice.invoiceNo} on all bank transfers.
          </p>
          <div className="w-full md:w-64 shrink-0 space-y-2">
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Total Due</span>
              <span>{formatPKR(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Paid</span>
              <span>{formatPKR(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-title-lg font-semibold text-primary pt-2 border-t border-outline-variant">
              <span>Balance Due</span>
              <span>{formatPKR(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {invoicePayments.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm mt-6 print:hidden">
          <div className="p-lg border-b border-outline-variant/40">
            <h3 className="text-title-lg font-semibold text-primary">Payment History</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {invoicePayments.map((p) => {
              const wasReversed = reversals.some((r) => r.paymentId === p.id);
              return (
              <div key={p.id} className="flex items-center justify-between px-lg py-4">
                <div>
                  <p className={`text-body-md font-medium ${wasReversed ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                    {formatPKR(p.amount)} · {p.method.replace("_", " ")}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {formatDate(p.date)} · Received by {p.receivedBy}
                    {p.reference ? ` · Ref: ${p.reference}` : ""}
                  </p>
                </div>
                {wasReversed ? (
                  <StatusBadge label="Reversed" tone="neutral" />
                ) : (
                  canManageFees && (
                    <Button variant="secondary" size="sm" onClick={() => setReversing(p)}>
                      <Undo2 size={14} /> Reverse
                    </Button>
                  )
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={discountOpen} onOpenChange={setDiscountOpen} title="Apply Discount / Concession" className="max-w-[28rem]">
        <ConcessionForm onSubmit={handleApplyDiscount} onCancel={() => setDiscountOpen(false)} />
      </Modal>

      <Modal
        open={!!reversing}
        onOpenChange={(open) => {
          if (!open) {
            setReversing(null);
            setReversalReason("");
          }
        }}
        title="Reverse this payment?"
        description={reversing ? `This reduces the invoice's paid amount by ${formatPKR(reversing.amount)}. This cannot be undone.` : undefined}
        className="max-w-[26rem]"
      >
        <div className="space-y-4">
          <FormField label="Reason for reversal" htmlFor="reversalReason" required>
            <Textarea id="reversalReason" rows={3} value={reversalReason} onChange={(e) => setReversalReason(e.target.value)} placeholder="e.g., Payment recorded in error" />
          </FormField>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setReversing(null); setReversalReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReverse}>
              Reverse Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
