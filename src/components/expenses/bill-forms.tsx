"use client";

import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { prepareUpload } from "@/lib/compress-image";
import { BILL_FREQUENCY_LABEL, PAYMENT_METHOD_LABEL, type BillFrequency, type PaymentMethod } from "@/lib/constants";
import { formatPKR } from "@/lib/format";
import { todayIso } from "@/lib/finance";
import type { ExpenseFormOptions } from "@/components/expenses/expense-form";

export interface BillFormValues {
  campusId: string;
  categoryId: string;
  name: string;
  payee: string;
  amount: string;
  frequency: BillFrequency;
  nextDueDate: string;
  notes: string;
}

/** Add / edit a recurring bill. */
export function BillForm({
  categories,
  campuses,
  allowSchoolWide,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: ExpenseFormOptions & { initialValues?: Partial<BillFormValues>; submitting?: boolean; onSubmit: (values: BillFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<BillFormValues>({
    campusId: initialValues?.campusId ?? (allowSchoolWide ? "" : (campuses[0]?.id ?? "")),
    categoryId: initialValues?.categoryId ?? categories.find((c) => c.name === "Utilities")?.id ?? "",
    name: initialValues?.name ?? "",
    payee: initialValues?.payee ?? "",
    amount: initialValues?.amount ?? "",
    frequency: initialValues?.frequency ?? "monthly",
    nextDueDate: initialValues?.nextDueDate ?? "",
    notes: initialValues?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BillFormValues, string>>>({});
  const set = <K extends keyof BillFormValues>(key: K, value: BillFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Give the bill a name.";
    if (!values.categoryId) next.categoryId = "Choose a category.";
    const amount = Number(values.amount);
    if (!values.amount || !Number.isInteger(amount) || amount <= 0) next.amount = "Enter the usual amount in whole rupees.";
    if (!values.nextDueDate) next.nextDueDate = "When is the next one due?";
    if (!allowSchoolWide && !values.campusId) next.campusId = "Choose a campus.";
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Bill name" htmlFor="bill-name" required error={errors.name}>
        <Input id="bill-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Electricity — Main Campus" autoFocus />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Usual amount (Rs.)" htmlFor="bill-amount" required error={errors.amount} hint="You can change it each time you pay.">
          <Input id="bill-amount" inputMode="numeric" value={values.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
        <FormField label="Repeats" htmlFor="bill-frequency" required>
          <Select id="bill-frequency" value={values.frequency} onChange={(e) => set("frequency", e.target.value as BillFrequency)} className="w-full">
            {Object.entries(BILL_FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Next due date" htmlFor="bill-due" required error={errors.nextDueDate}>
          <Input id="bill-due" type="date" value={values.nextDueDate} onChange={(e) => set("nextDueDate", e.target.value)} />
        </FormField>
        <FormField label="Category" htmlFor="bill-category" required error={errors.categoryId}>
          <Select id="bill-category" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="w-full">
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Campus" htmlFor="bill-campus" required={!allowSchoolWide} error={errors.campusId}>
          <Select id="bill-campus" value={values.campusId} onChange={(e) => set("campusId", e.target.value)} className="w-full">
            {allowSchoolWide && <option value="">Whole school (shared)</option>}
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Paid to" htmlFor="bill-payee">
          <Input id="bill-payee" value={values.payee} onChange={(e) => set("payee", e.target.value)} placeholder="e.g. K-Electric" />
        </FormField>
      </div>
      <FormField label="Notes (optional)" htmlFor="bill-notes" hint="Account or consumer number, landlord's contact…">
        <Textarea id="bill-notes" rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormField>
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : initialValues ? "Save Bill" : "Add Bill"}</Button>
      </div>
    </form>
  );
}

/** Record this period's payment of a bill (becomes an expense). */
export function PayBillForm({
  bill,
  approvalNote,
  submitting,
  onSubmit,
  onCancel,
}: {
  bill: { name: string; amount: number; nextDueDate: string };
  approvalNote?: string;
  submitting?: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(bill.amount));
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || !Number.isInteger(value) || value <= 0) {
      setError("Enter the amount paid in whole rupees.");
      return;
    }
    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("date", date);
    formData.set("method", method);
    formData.set("reference", reference);
    if (receipt) formData.set("receipt", receipt);
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-body-md text-on-surface-variant">
        Usually {formatPKR(bill.amount)}. Recording this payment adds it to Expenses and moves the bill to its next due date.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Amount paid (Rs.)" htmlFor="pay-amount" required error={error}>
          <Input id="pay-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} autoFocus />
        </FormField>
        <FormField label="Paid on" htmlFor="pay-date" required>
          <Input id="pay-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Paid by" htmlFor="pay-method" required>
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full">
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference (optional)" htmlFor="pay-reference">
          <Input id="pay-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction or cheque no." />
        </FormField>
      </div>
      <FormField label="Receipt (optional)" htmlFor="pay-receipt" hint="Photo or PDF of the paid bill. Large photos are shrunk automatically.">
        <Input id="pay-receipt" type="file" accept="image/*,application/pdf" onChange={async (e) => {
            const picked = e.target.files?.[0];
            if (!picked) return setReceipt(null);
            // Large phone photos are shrunk before upload (lib/compress-image.ts).
            const prepared = await prepareUpload(picked);
            if ("error" in prepared) {
              e.target.value = "";
              setReceipt(null);
              toast.error(prepared.error);
              return;
            }
            setReceipt(prepared.file);
          }} />
      </FormField>
      {approvalNote && <p className="rounded-lg bg-warning-container/60 px-3 py-2 text-label-md text-on-warning-container">{approvalNote}</p>}
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Record Payment"}</Button>
      </div>
    </form>
  );
}
