"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";
import type { Campus } from "@/lib/types";

interface ClassReportRow {
  classId: string;
  classLabel: string;
  campusId: string;
  campusName: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

export function AttendanceReportsClient({
  rows,
  campuses,
  isAllCampuses,
  distribution,
  overallRate,
  totalMarked,
  classCount,
}: {
  rows: ClassReportRow[];
  campuses: Campus[];
  isAllCampuses: boolean;
  distribution: { name: string; value: number; color: string }[];
  overallRate: number;
  totalMarked: number;
  classCount: number;
}) {
  const columns: Column<ClassReportRow>[] = [
    { key: "class", header: "Class / Section", sortable: true, accessor: (r) => r.classLabel, render: (r) => <span className="font-medium text-primary">{r.classLabel}</span> },
    { key: "campus", header: "Campus", accessor: (r) => r.campusName, className: "text-on-surface-variant" },
    { key: "total", header: "Records", accessor: (r) => r.total, className: "text-on-surface-variant" },
    { key: "present", header: "Present", accessor: (r) => r.present, className: "text-on-surface-variant" },
    { key: "absent", header: "Absent", accessor: (r) => r.absent, className: "text-on-surface-variant" },
    {
      key: "rate",
      header: "Attendance %",
      sortable: true,
      accessor: (r) => r.rate,
      render: (r) => <span className={r.rate >= 90 ? "text-emerald-600 font-semibold" : r.rate >= 75 ? "font-medium" : "text-error font-semibold"}>{r.rate}%</span>,
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      render: (r) => (
        <Link href={`/classes/${r.classId}`} className="text-label-md text-secondary hover:underline">
          View Class
        </Link>
      ),
    },
  ];

  function handleExport() {
    downloadCsv(
      "attendance-report",
      ["Class/Section", "Campus", "Records", "Present", "Absent", "Attendance %"],
      rows.map((r) => [r.classLabel, r.campusName, r.total, r.present, r.absent, r.rate]),
    );
    toast.success("Attendance report exported.");
  }

  return (
    <div>
      <PageHeader
        title="Attendance Reports"
        description="Cumulative report across every attendance record on file."
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={16} /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChartCard title="Attendance Distribution" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {distribution.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryStat label="Overall Rate" value={`${overallRate}%`} />
            <SummaryStat label="Total Records" value={totalMarked.toLocaleString()} />
            <SummaryStat label="Campuses" value={String(campuses.length)} />
            <SummaryStat label="Classes Tracked" value={String(classCount)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-title-lg font-semibold text-primary mb-4">Class Records</h3>
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.classId}
          filters={isAllCampuses ? [{ key: "campusId", label: "Campus", options: campuses.map((c) => ({ label: c.name, value: c.id })) }] : []}
          filterFn={(r, values) => !values.campusId || r.campusId === values.campusId}
        />
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">{label}</p>
      <p className="text-headline-sm font-semibold text-primary">{value}</p>
    </div>
  );
}
