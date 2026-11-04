"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { recordPaymentAction } from "@/app/(app)/fees/collect/actions";
import { STUDENT_STATUS_LABEL, studentStatusTone } from "@/lib/constants";
import { formatDate, formatPKR } from "@/lib/format";
import type { ClassSection, FeeInvoice, PaymentMethod, Student } from "@/lib/types";

/** DB-sourced invoice rows have no embedded `items` (those live in a separate table) — this page never reads line items, so the type just omits it. */
type InvoiceRow = Omit<FeeInvoice, "items">;

function CollectFeeContent({ students, classes, invoices }: { students: Student[]; classes: ClassSection[]; invoices: InvoiceRow[] }) {
  const router = useLoadingRouter();
  const params = useSearchParams();
  const classById = new Map(classes.map((c) => [c.id, c]));
  const classLabel = (classId: string) => (classById.get(classId) ? `${classById.get(classId)!.grade}-${classById.get(classId)!.section}` : "—");

  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState(params.get("studentId") ?? "");
  const [invoiceId, setInvoiceId] = useState(params.get("invoiceId") ?? "");
  const [amount, setAmount] = useState(() => {
    const initialInvoice = invoices.find((i) => i.id === params.get("invoiceId"));
    return initialInvoice ? initialInvoice.totalAmount - initialInvoice.paidAmount : 0;
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)).slice(0, 6);
  }, [query, students]);

  const student = students.find((s) => s.id === studentId);
  const studentInvoices = invoices.filter((i) => i.studentId === studentId);
  const outstandingInvoices = studentInvoices.filter((i) => i.totalAmount > i.paidAmount);
  const selectedInvoice = invoices.find((i) => i.id === invoiceId);
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  function selectStudent(id: string) {
    setStudentId(id);
    setQuery("");
    const firstOutstanding = invoices.find((i) => i.studentId === id && i.totalAmount > i.paidAmount);
    setInvoiceId(firstOutstanding?.id ?? "");
    setAmount(firstOutstanding ? firstOutstanding.totalAmount - firstOutstanding.paidAmount : 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice || amount <= 0) {
      toast.error("Select an invoice and enter a valid amount.");
      return;
    }
    setSubmitting(true);
    const result = await recordPaymentAction({ invoiceId: selectedInvoice.id, studentId, amount, method, date, reference: reference || undefined });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Payment of ${formatPKR(amount)} recorded for ${student?.name}.`);
    router.push(`/fees/invoices/${result.invoiceId}`);
  }

  return (
    <div>
      <PageHeader title="Fee Collection" description="Search a student and record a fee payment." backHref="/fees" backLabel="Fees" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student by name, roll or admission no…"
              aria-label="Search student by name, roll or admission number"
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant/70 hover:border-outline focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
            {query.trim() && searchResults.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-body-md text-on-surface-variant shadow-lg">
                No students match “{query.trim()}”.
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg overflow-hidden">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectStudent(s.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low focus-visible:bg-surface-container-low outline-none transition-colors text-left"
                  >
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <p className="text-body-md text-on-surface">{s.name}</p>
                      <p className="text-label-sm text-on-surface-variant">{classLabel(s.classId)} · {s.rollNumber}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {student ? (
            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-lg card-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={student.name} size="lg" />
                <div>
                  <h3 className="text-title-lg font-semibold text-on-surface">{student.name}</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container-high text-on-surface text-label-sm mt-1">
                    {classLabel(student.classId)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-body-md mb-4">
                <div className="flex justify-between"><span className="text-on-surface-variant">Parent/Guardian</span><span className="text-on-surface">{student.parentName}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Contact</span><span className="text-on-surface">{student.parentPhone}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Status</span>
                  <StatusBadge label={STUDENT_STATUS_LABEL[student.status]} tone={studentStatusTone(student.status)} />
                </div>
              </div>
              <div className="bg-error-container/30 rounded-lg p-3">
                <span className="text-label-md text-on-error-container block mb-1">Outstanding Balance</span>
                <span className="text-headline-sm font-semibold text-error">{formatPKR(totalOutstanding)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest/60">
              <EmptyState icon="search" title="Find a student" description="Search by name, roll number or admission number to load their invoices." compact />
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {student ? (
            <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl card-shadow p-lg space-y-6">
              <div>
                <h3 className="text-title-lg font-semibold text-primary mb-3">Select Invoice</h3>
                {studentInvoices.length === 0 ? (
                  <EmptyState icon="receipt_long" title="No invoices yet" description="This student has no fee invoices. Generate invoices from Fees → Generate." compact />
                ) : (
                <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-label-md text-on-surface-variant">
                    <tr>
                      <th scope="col" className="px-lg py-sm font-medium w-8"><span className="sr-only">Select</span></th>
                      <th scope="col" className="px-lg py-sm font-medium">Month</th>
                      <th scope="col" className="px-lg py-sm font-medium">Due Date</th>
                      <th scope="col" className="px-lg py-sm font-medium text-right">Amount (Rs.)</th>
                      <th scope="col" className="px-lg py-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {studentInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${inv.totalAmount <= inv.paidAmount ? "opacity-60" : "cursor-pointer hover:bg-surface-container-low"} ${invoiceId === inv.id ? "bg-secondary-fixed/40" : ""}`}
                        onClick={() => {
                          if (inv.totalAmount <= inv.paidAmount) return;
                          setInvoiceId(inv.id);
                          setAmount(inv.totalAmount - inv.paidAmount);
                        }}
                      >
                        <td className="px-lg py-sm">
                          <input
                            type="radio"
                            name="invoice"
                            aria-label={`${inv.month} invoice, ${(inv.totalAmount - inv.paidAmount).toLocaleString()} rupees due`}
                            className="h-4 w-4 accent-secondary"
                            checked={invoiceId === inv.id}
                            onChange={() => {
                              setInvoiceId(inv.id);
                              setAmount(inv.totalAmount - inv.paidAmount);
                            }}
                            disabled={inv.totalAmount <= inv.paidAmount}
                          />
                        </td>
                        <td className="px-lg py-sm text-on-surface">{inv.month}</td>
                        <td className="px-lg py-sm text-on-surface-variant">
                          <span className="text-label-sm bg-surface-container px-2 py-1 rounded border border-outline-variant">Due: {formatDate(inv.dueDate)}</span>
                        </td>
                        <td className="px-lg py-sm text-right text-on-surface">{(inv.totalAmount - inv.paidAmount).toLocaleString()}</td>
                        <td className="px-lg py-sm">
                          <StatusBadge
                            label={inv.status[0].toUpperCase() + inv.status.slice(1)}
                            tone={inv.status === "paid" ? "success" : inv.status === "partial" ? "warning" : "error"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Payment Amount (Rs.)"
                  htmlFor="amount"
                  required
                  hint={selectedInvoice ? `Balance on ${selectedInvoice.month}: ${formatPKR(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}` : undefined}
                  error={amount < 0 ? "Amount can't be negative." : undefined}
                >
                  <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </FormField>
                <FormField label="Payment Date" htmlFor="date">
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </FormField>
                <FormField label="Payment Method" htmlFor="method">
                  <Select id="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </Select>
                </FormField>
                <FormField label="Reference Number / Cheque No." htmlFor="reference">
                  <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
                </FormField>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40">
                <Button type="button" variant="secondary" onClick={() => router.push("/fees")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!invoiceId || submitting}>
                  {submitting && <Loader2 className="motion-safe:animate-spin" />}
                  {submitting ? "Recording…" : selectedInvoice && amount > 0 ? `Record ${formatPKR(amount)}` : "Record Payment"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest/60">
              <EmptyState icon="receipt_long" title="No student selected" description="Select a student to view their invoices and record a payment." compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CollectFeeClient(props: { students: Student[]; classes: ClassSection[]; invoices: InvoiceRow[] }) {
  return (
    <Suspense>
      <CollectFeeContent {...props} />
    </Suspense>
  );
}
