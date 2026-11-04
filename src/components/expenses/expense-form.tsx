"use client";

import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/constants";
import { todayIso } from "@/lib/finance";

export interface ExpenseFormValues {
  campusId: string;
  categoryId: string;
  date: string;
  amount: string;
  payee: string;
  description: string;
  method: PaymentMethod;
  reference: string;
}

export interface ExpenseFormOptions {
  categories: { id: string; name: string }[];
  campuses: { id: string; name: string }[];
  /** Campus-limited roles can't record a school-wide cost. */
  allowSchoolWide: boolean;
}

interface ExpenseFormProps extends ExpenseFormOptions {
  initialValues?: Partial<ExpenseFormValues>;
  /** Shown under the receipt picker when editing. */
  existingReceipts?: { id: string; fileName: string }[];
  onRemoveReceipt?: (attachmentId: string) => void;
  /** Shown above the buttons, e.g. "This will be sent for approval." */
  approvalNote?: string;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}

export function ExpenseForm({
  categories,
  campuses,
  allowSchoolWide,
  initialValues,
  existingReceipts = [],
  onRemoveReceipt,
  approvalNote,
  submitLabel = "Save Expense",
  submitting,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>({
    campusId: initialValues?.campusId ?? (allowSchoolWide ? "" : (campuses[0]?.id ?? "")),
    categoryId: initialValues?.categoryId ?? "",
    date: initialValues?.date ?? todayIso(),
    amount: initialValues?.amount ?? "",
    payee: initialValues?.payee ?? "",
    description: initialValues?.description ?? "",
    method: initialValues?.method ?? "cash",
    reference: initialValues?.reference ?? "",
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormValues, string>>>({});

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.categoryId) next.categoryId = "Choose a category.";
    const amount = Number(values.amount);
    if (!values.amount || !Number.isInteger(amount) || amount <= 0) next.amount = "Enter the amount in whole rupees.";
    if (!values.date) next.date = "Enter the date.";
    if (!allowSchoolWide && !values.campusId) next.campusId = "Choose a campus.";
    if (!values.payee.trim() && !values.description.trim()) next.description = "Say who was paid or what it was for.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value);
    if (receipt) formData.set("receipt", receipt);
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Amount (Rs.)" htmlFor="expense-amount" required error={errors.amount}>
          <Input
            id="expense-amount"
            inputMode="numeric"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 25000"
            aria-invalid={!!errors.amount}
            autoFocus
          />
        </FormField>
        <FormField label="Date" htmlFor="expense-date" required error={errors.date}>
          <Input id="expense-date" type="date" value={values.date} max={todayIso()} onChange={(e) => set("date", e.target.value)} aria-invalid={!!errors.date} />
        </FormField>
        <FormField label="Category" htmlFor="expense-category" required error={errors.categoryId}>
          <Select id="expense-category" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="w-full" aria-invalid={!!errors.categoryId}>
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Campus" htmlFor="expense-campus" required={!allowSchoolWide} error={errors.campusId} hint={allowSchoolWide ? "Leave as whole school for shared costs." : undefined}>
          <Select id="expense-campus" value={values.campusId} onChange={(e) => set("campusId", e.target.value)} className="w-full">
            {allowSchoolWide && <option value="">Whole school (shared)</option>}
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Paid to" htmlFor="expense-payee" hint="Supplier, company or person.">
          <Input id="expense-payee" value={values.payee} onChange={(e) => set("payee", e.target.value)} placeholder="e.g. K-Electric, Al-Noor Stationers" />
        </FormField>
        <FormField label="Paid by" htmlFor="expense-method" required>
          <Select id="expense-method" value={values.method} onChange={(e) => set("method", e.target.value as PaymentMethod)} className="w-full">
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Description" htmlFor="expense-description" error={errors.description}>
        <Textarea id="expense-description" rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What was it for?" />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Reference (optional)" htmlFor="expense-reference" hint="Cheque, transaction or bill number.">
          <Input id="expense-reference" value={values.reference} onChange={(e) => set("reference", e.target.value)} />
        </FormField>
        <FormField label="Receipt (optional)" htmlFor="expense-receipt" hint="Photo or PDF, up to 15MB.">
          <Input id="expense-receipt" type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
        </FormField>
      </div>
      {existingReceipts.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-surface-container-low px-3 py-2 text-label-md text-on-surface-variant">
          {existingReceipts.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <a href={`/api/files/${r.id}`} className="truncate text-secondary hover:underline">{r.fileName}</a>
              {onRemoveReceipt && (
                <button type="button" onClick={() => onRemoveReceipt(r.id)} className="shrink-0 font-semibold text-error hover:underline">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {approvalNote && <p className="rounded-lg bg-warning-container/60 px-3 py-2 text-label-md text-on-warning-container">{approvalNote}</p>}
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
