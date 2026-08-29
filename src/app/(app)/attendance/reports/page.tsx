"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { useAttendanceStore } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { CAMPUSES, CLASSES, campusName, classLabel } from "@/lib/mock/reference-data";
import { SCHOOL_DAYS } from "@/lib/mock/attendance";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/lib/csv-export";
import type { ClassSection } from "@/lib/types";

const COLORS = {
  present: "#4648d4",
  absent: "#ba1a1a",
  leave: "#75777d",
  late: "#d97706",
};

interface ClassReportRow {
  cls: ClassSection;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

export default function AttendanceReportsPage() {
  const { attendance } = useAttendanceStore();
  const { scopedCampusId } = useCampusScope();

  const scopedClasses = scopedCampusId ? CLASSES.filter((c) => c.campusId === scopedCampusId) : CLASSES;
  const scopedClassIds = new Set(scopedClasses.map((c) => c.id));
  const scopedAttendance = attendance.filter((a) => scopedClassIds.has(a.classId));

  const distribution = ["present", "absent", "leave", "late"].map((status) => ({
    name: status[0].toUpperCase() + status.slice(1),
    value: scopedAttendance.filter((a) => a.status === status).length,
    color: COLORS[status as keyof typeof COLORS],
  }));

  const totalMarked = scopedAttendance.length;
  const presentTotal = scopedAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const overallRate = totalMarked ? Math.round((presentTotal / totalMarked) * 100) : 0;

  const rows: ClassReportRow[] = scopedClasses.map((cls) => {
    const records = scopedAttendance.filter((a) => a.classId === cls.id);
    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    return {
      cls,
      total: records.length,
      present,
      absent: records.filter((r) => r.status === "absent").length,
      rate: records.length ? Math.round((present / records.length) * 100) : 0,
    };
  });

  const columns: Column<ClassReportRow>[] = [
    { key: "class", header: "Class / Section", sortable: true, accessor: (r) => classLabel(r.cls), render: (r) => <span className="font-medium text-primary">{classLabel(r.cls)}</span> },
    { key: "campus", header: "Campus", accessor: (r) => campusName(r.cls.campusId), className: "text-on-surface-variant" },
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
        <Link href={`/classes/${r.cls.id}`} className="text-label-md text-secondary hover:underline">
          View Class
        </Link>
      ),
    },
  ];

  function handleExport() {
    downloadCsv(
      "attendance-report",
      ["Class", "Section", "Campus", "Records", "Present", "Absent", "Attendance %"],
      rows.map((r) => [r.cls.grade, r.cls.section, campusName(r.cls.campusId), r.total, r.present, r.absent, r.rate]),
    );
    toast.success("Attendance report exported.");
  }

  return (
    <div>
      <PageHeader
        title="Attendance Reports"
        description={`Cumulative report across the last ${SCHOOL_DAYS.length} school days (${formatDate(SCHOOL_DAYS[0])} – ${formatDate(SCHOOL_DAYS[SCHOOL_DAYS.length - 1])}).`}
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
            <SummaryStat label="Campuses" value={String(CAMPUSES.length)} />
            <SummaryStat label="Classes Tracked" value={String(scopedClasses.length)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-title-lg font-semibold text-primary mb-4">Class Records</h3>
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.cls.id}
          filters={[{ key: "campusId", label: "Campus", options: CAMPUSES.map((c) => ({ label: c.name, value: c.id })) }]}
          filterFn={(r, values) => !values.campusId || r.cls.campusId === values.campusId}
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
