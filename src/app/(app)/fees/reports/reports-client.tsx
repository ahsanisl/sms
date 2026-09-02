"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatCompactPKR, formatDate, formatPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";
import type { Campus } from "@/lib/types";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
};

interface PaymentRow {
  id: string;
  date: string;
  amount: number;
  method: string;
  studentName: string;
  studentCampusId: string;
  classLabel: string;
}

export function FeeReportsClient({
  payments,
  campuses,
  totalCollected,
  totalOutstanding,
  overdueCount,
  isAllCampuses,
}: {
  payments: PaymentRow[];
  campuses: Campus[];
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  isAllCampuses: boolean;
}) {
  const columns: Column<PaymentRow>[] = [
    { key: "id", header: "Receipt No.", accessor: (p) => p.id.toUpperCase().slice(0, 8), className: "text-on-surface-variant whitespace-nowrap" },
    { key: "date", header: "Date", sortable: true, accessor: (p) => p.date, render: (p) => formatDate(p.date), className: "text-on-surface-variant whitespace-nowrap" },
    {
      key: "student",
      header: "Student Name",
      accessor: (p) => p.studentName,
      render: (p) => <span className="font-medium text-on-surface">{p.studentName}</span>,
    },
    { key: "class", header: "Class/Sec", accessor: (p) => p.classLabel, className: "text-on-surface-variant whitespace-nowrap" },
    { key: "method", header: "Payment Mode", accessor: (p) => METHOD_LABEL[p.method] ?? p.method, className: "text-on-surface-variant whitespace-nowrap" },
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
      payments.map((p) => [p.id.toUpperCase().slice(0, 8), p.date, p.studentName, p.classLabel, METHOD_LABEL[p.method] ?? p.method, p.amount]),
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
        <StatCard label="Outstanding (This Month)" value={formatCompactPKR(totalOutstanding)} icon="account_balance_wallet" />
        <StatCard label="Overdue Invoices" value={String(overdueCount)} icon="warning" />
      </div>

      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p.id}
        searchPlaceholder="Search by student name…"
        searchKeys={(p) => [p.studentName]}
        filters={[
          ...(isAllCampuses ? [{ key: "campusId", label: "Campus", options: campuses.map((c) => ({ label: c.name, value: c.id })) }] : []),
          { key: "method", label: "Payment Mode", options: Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
        filterFn={(p, values) => (!values.campusId || p.studentCampusId === values.campusId) && (!values.method || p.method === values.method)}
      />
    </div>
  );
}
