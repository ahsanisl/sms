"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { useFeesStore, useStudents } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { CAMPUSES, classLabel } from "@/lib/mock/reference-data";
import { formatCompactPKR, formatDate, formatPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";
import type { FeePayment } from "@/lib/types";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
};

export default function FeeReportsPage() {
  const { payments, invoices } = useFeesStore();
  const { students } = useStudents();
  const { scopedCampusId, isAllCampuses } = useCampusScope();

  const scopedStudentIds = new Set((scopedCampusId ? students.filter((s) => s.campusId === scopedCampusId) : students).map((s) => s.id));
  const scopedPayments = scopedCampusId ? payments.filter((p) => scopedStudentIds.has(p.studentId)) : payments;
  const scopedInvoices = scopedCampusId ? invoices.filter((i) => scopedStudentIds.has(i.studentId)) : invoices;

  const totalCollected = scopedPayments.reduce((s, p) => s + p.amount, 0);
  const currentMonthInvoices = scopedInvoices.filter((i) => i.month === "August 2026");
  const totalOutstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueCount = currentMonthInvoices.filter((i) => i.status === "overdue").length;

  const columns: Column<FeePayment>[] = [
    { key: "id", header: "Receipt No.", accessor: (p) => p.id.toUpperCase(), className: "text-on-surface-variant whitespace-nowrap" },
    { key: "date", header: "Date", sortable: true, accessor: (p) => p.date, render: (p) => formatDate(p.date), className: "text-on-surface-variant whitespace-nowrap" },
    {
      key: "student",
      header: "Student Name",
      accessor: (p) => students.find((s) => s.id === p.studentId)?.name ?? "—",
      render: (p) => <span className="font-medium text-on-surface">{students.find((s) => s.id === p.studentId)?.name ?? "—"}</span>,
    },
    {
      key: "class",
      header: "Class/Sec",
      accessor: (p) => {
        const s = students.find((s) => s.id === p.studentId);
        return s ? classLabel(s.classId) : "—";
      },
      className: "text-on-surface-variant whitespace-nowrap",
    },
    { key: "method", header: "Payment Mode", accessor: (p) => METHOD_LABEL[p.method], className: "text-on-surface-variant whitespace-nowrap" },
    {
      key: "amount",
      header: "Amount Collected",
      sortable: true,
      accessor: (p) => p.amount,
      render: (p) => formatPKR(p.amount),
      className: "text-right font-medium",
    },
  ];

  function handleExport() {
    downloadCsv(
      "fee-payments",
      ["Receipt No.", "Date", "Student Name", "Class/Sec", "Payment Mode", "Amount Collected (PKR)"],
      scopedPayments.map((p) => [
        p.id.toUpperCase(),
        p.date,
        students.find((s) => s.id === p.studentId)?.name ?? "—",
        (() => {
          const s = students.find((s) => s.id === p.studentId);
          return s ? classLabel(s.classId) : "—";
        })(),
        METHOD_LABEL[p.method],
        p.amount,
      ]),
    );
    toast.success("Fee payments exported.");
  }

  return (
    <div>
      <PageHeader
        title="Fee Reports"
        description={isAllCampuses ? "Payment history and collection summary across all campuses." : "Payment history and collection summary for this campus."}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={16} /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Collected (All Time)" value={formatCompactPKR(totalCollected)} icon="payments" />
        <StatCard label="Outstanding (August 2026)" value={formatCompactPKR(totalOutstanding)} icon="account_balance_wallet" />
        <StatCard label="Overdue Invoices" value={String(overdueCount)} icon="warning" />
      </div>

      <DataTable
        columns={columns}
        data={scopedPayments}
        rowKey={(p) => p.id}
        searchPlaceholder="Search by student name…"
        searchKeys={(p) => [students.find((s) => s.id === p.studentId)?.name ?? ""]}
        filters={[
          ...(isAllCampuses ? [{ key: "campusId", label: "Campus", options: CAMPUSES.map((c) => ({ label: c.name, value: c.id })) }] : []),
          { key: "method", label: "Payment Mode", options: Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
        filterFn={(p, values) => {
          const student = students.find((s) => s.id === p.studentId);
          return (!values.campusId || student?.campusId === values.campusId) && (!values.method || p.method === values.method);
        }}
      />
    </div>
  );
}
