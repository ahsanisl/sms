"use client";

import { todayIso } from "@/lib/dates";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface HomeworkRow {
  id: string;
  classId: string;
  classLabel: string;
  subjectName: string;
  teacherName: string;
  title: string;
  assignedDate: string;
  dueDate: string;
}

export function HomeworkListClient({ rows, classes, canManage }: { rows: HomeworkRow[]; classes: { id: string; label: string }[]; canManage: boolean }) {
  const today = todayIso();

  const columns: Column<HomeworkRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      accessor: (r) => r.title,
      render: (r) => (
        <Link href={`/homework/${r.id}`} className="font-medium text-primary hover:underline">
          {r.title}
        </Link>
      ),
    },
    { key: "class", header: "Class", accessor: (r) => r.classLabel },
    { key: "subject", header: "Subject", accessor: (r) => r.subjectName, className: "text-on-surface-variant" },
    { key: "teacher", header: "Teacher", accessor: (r) => r.teacherName, className: "text-on-surface-variant" },
    { key: "due", header: "Due Date", sortable: true, accessor: (r) => r.dueDate, render: (r) => <span className={r.dueDate < today ? "text-error font-medium" : ""}>{formatDate(r.dueDate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Homework"
        description="Homework assigned to each class, with student submissions and grading."
        actions={
          canManage && (
            <Button size="sm" asChild>
              <Link href="/homework/new">
                <Plus size={16} /> New Homework
              </Link>
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        searchPlaceholder="Search homework…"
        searchKeys={(r) => [r.title]}
        filters={[{ key: "classId", label: "Class", options: classes.map((c) => ({ value: c.id, label: c.label })) }]}
        filterFn={(r, values) => !values.classId || r.classId === values.classId}
      />
    </div>
  );
}
