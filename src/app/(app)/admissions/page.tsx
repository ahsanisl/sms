"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useAdmissions } from "@/lib/store/hooks";
import { useCampusScope } from "@/lib/campus-scope";
import { CAMPUSES, campusName } from "@/lib/mock/reference-data";
import { INQUIRY_STAGE_LABEL, INQUIRY_STAGE_TONE } from "@/lib/mock/admissions";
import { formatDate } from "@/lib/format";
import type { Inquiry } from "@/lib/types";

export default function AdmissionsPage() {
  const router = useRouter();
  const { inquiries } = useAdmissions();
  const { scopedCampusId, isAllCampuses } = useCampusScope();

  const scoped = scopedCampusId ? inquiries.filter((i) => i.campusId === scopedCampusId) : inquiries;
  const inProgress = scoped.filter((i) => i.stage !== "admitted" && i.stage !== "rejected").length;
  const admitted = scoped.filter((i) => i.stage === "admitted").length;
  const rejected = scoped.filter((i) => i.stage === "rejected").length;

  const columns: Column<Inquiry>[] = [
    {
      key: "childName",
      header: "Child",
      sortable: true,
      accessor: (i) => i.childName,
      render: (i) => <span className="font-medium text-primary">{i.childName}</span>,
    },
    { key: "grade", header: "Grade Applied For", accessor: (i) => i.gradeAppliedFor, className: "text-on-surface-variant" },
    { key: "campus", header: "Campus", accessor: (i) => campusName(i.campusId), className: "text-on-surface-variant" },
    { key: "parentName", header: "Parent", accessor: (i) => i.parentName, className: "text-on-surface-variant" },
    { key: "source", header: "Source", accessor: (i) => i.source, className: "text-on-surface-variant" },
    { key: "updatedAt", header: "Last Update", sortable: true, accessor: (i) => i.updatedAt, render: (i) => formatDate(i.updatedAt), className: "text-on-surface-variant whitespace-nowrap" },
    {
      key: "stage",
      header: "Stage",
      render: (i) => <StatusBadge label={INQUIRY_STAGE_LABEL[i.stage]} tone={INQUIRY_STAGE_TONE[i.stage]} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admissions"
        description={isAllCampuses ? "Track prospective students from first inquiry through admission." : "Track prospective students from first inquiry through admission, for this campus."}
        actions={
          <Button size="sm" asChild>
            <Link href="/admissions/new">
              <Plus size={16} /> Log Inquiry
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Inquiries" value={String(scoped.length)} icon="how_to_reg" />
        <StatCard label="In Progress" value={String(inProgress)} icon="pending_actions" />
        <StatCard label="Admitted" value={String(admitted)} icon="task_alt" />
        <StatCard label="Rejected" value={String(rejected)} icon="cancel" />
      </div>

      <DataTable
        columns={columns}
        data={scoped}
        rowKey={(i) => i.id}
        searchPlaceholder="Search by child or parent name…"
        searchKeys={(i) => [i.childName, i.parentName, i.parentPhone]}
        filters={[
          { key: "stage", label: "Stage", options: Object.entries(INQUIRY_STAGE_LABEL).map(([value, label]) => ({ value, label })) },
          ...(isAllCampuses ? [{ key: "campusId", label: "Campus", options: CAMPUSES.map((c) => ({ value: c.id, label: c.name })) }] : []),
        ]}
        filterFn={(i, values) => (!values.stage || i.stage === values.stage) && (!values.campusId || i.campusId === values.campusId)}
        onRowClick={(i) => router.push(`/admissions/${i.id}`)}
        emptyTitle="No inquiries yet"
        emptyDescription="Log a new inquiry to start tracking a prospective student."
      />
    </div>
  );
}
