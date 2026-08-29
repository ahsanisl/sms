"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useFeesStore, useStudents } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { classLabel } from "@/lib/mock/reference-data";
import { formatDate, formatPKR } from "@/lib/format";

export default function ParentFeesPage() {
  const { user } = useSession();
  const { students } = useStudents();
  const { invoices } = useFeesStore();

  const children = students.filter((s) => user?.childStudentIds?.includes(s.id));

  return (
    <div>
      <PageHeader title="Fee Payments" description="Invoices and payment history for your children." />

      {children.length === 0 ? (
        <EmptyState icon="payments" title="No children linked to this account" description="Contact the school office if this looks wrong." />
      ) : (
        <div className="space-y-8">
          {children.map((child) => {
            const childInvoices = [...invoices.filter((i) => i.studentId === child.id)].sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
            const outstanding = childInvoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);
            return (
              <div key={child.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <div className="p-lg border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={child.name} size="lg" />
                    <div>
                      <p className="text-title-lg font-semibold text-on-surface">{child.name}</p>
                      <p className="text-label-sm text-on-surface-variant">{classLabel(child.classId)} · Roll {child.rollNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Outstanding Balance</p>
                      <p className={`text-headline-sm font-semibold ${outstanding > 0 ? "text-error" : "text-emerald-600"}`}>
                        {outstanding > 0 ? formatPKR(outstanding) : "Fully Paid"}
                      </p>
                    </div>
                    <Link href={`/students/${child.id}/ledger`} className="text-label-md text-secondary hover:underline whitespace-nowrap">
                      View Statement →
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-outline-variant/20">
                  {childInvoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/fees/invoices/${inv.id}`}
                      className="flex items-center justify-between px-lg py-4 hover:bg-surface-container-low transition-colors"
                    >
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{inv.month}</p>
                        <p className="text-label-sm text-on-surface-variant">{inv.invoiceNo} · Due {formatDate(inv.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-body-md font-medium text-on-surface">{formatPKR(inv.totalAmount)}</span>
                        <StatusBadge
                          label={inv.status[0].toUpperCase() + inv.status.slice(1)}
                          tone={inv.status === "paid" ? "success" : inv.status === "partial" ? "warning" : "error"}
                        />
                      </div>
                    </Link>
                  ))}
                  {childInvoices.length === 0 && (
                    <p className="px-lg py-6 text-body-md text-on-surface-variant">No invoices yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
