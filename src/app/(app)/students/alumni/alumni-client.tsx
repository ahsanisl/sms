"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Avatar } from "@/components/shared/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { reactivateStudentAction } from "@/app/(app)/students/alumni/actions";
import { formatDate } from "@/lib/format";

interface AlumniRow {
  id: string;
  name: string;
  admissionNo: string;
  classLabel: string;
  campusName: string;
  graduatedOn: string | null;
}

interface CampusCount {
  id: string;
  name: string;
  count: number;
}

export function AlumniClient({
  alumni,
  campusCounts,
  isAllCampuses,
  canManage,
  description,
}: {
  alumni: AlumniRow[];
  campusCounts: CampusCount[];
  isAllCampuses: boolean;
  canManage: boolean;
  description: string;
}) {
  const router = useRouter();
  const [reactivating, setReactivating] = useState<AlumniRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleReactivate() {
    if (!reactivating) return;
    setBusy(true);
    const result = await reactivateStudentAction(reactivating.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${reactivating.name} was reactivated.`);
    setReactivating(null);
    router.refresh();
  }

  const columns: Column<AlumniRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      accessor: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} />
          <span className="font-semibold text-primary">{s.name}</span>
        </div>
      ),
    },
    { key: "admissionNo", header: "Admission No.", accessor: (s) => s.admissionNo, className: "text-on-surface-variant" },
    { key: "lastClass", header: "Last Class", accessor: (s) => s.classLabel, className: "text-on-surface-variant" },
    { key: "campus", header: "Campus", accessor: (s) => s.campusName, className: "text-on-surface-variant" },
    {
      key: "graduatedOn",
      header: "Graduated On",
      accessor: (s) => s.graduatedOn ?? "",
      render: (s) => (s.graduatedOn ? formatDate(s.graduatedOn) : "—"),
      className: "text-on-surface-variant whitespace-nowrap",
    },
  ];

  return (
    <div>
      <PageHeader title="Alumni Directory" description={description} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Alumni" value={String(alumni.length)} icon="school" />
        {isAllCampuses && campusCounts.slice(0, 3).map((c) => <StatCard key={c.id} label={c.name} value={String(c.count)} icon="business" />)}
      </div>

      <DataTable
        columns={columns}
        data={alumni}
        rowKey={(s) => s.id}
        searchPlaceholder="Search alumni by name or admission no…"
        searchKeys={(s) => [s.name, s.admissionNo]}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        rowActions={
          canManage
            ? (s) => (
                <button className="text-label-md text-error hover:underline" onClick={() => setReactivating(s)}>Reactivate</button>
              )
            : undefined
        }
        emptyTitle="No alumni yet"
        emptyDescription="Students who graduate through Promotion or are marked Alumni via Withdraw will appear here."
      />

      <ConfirmDialog
        open={!!reactivating}
        onOpenChange={(open) => !open && setReactivating(null)}
        title="Reactivate this student?"
        description={reactivating ? `${reactivating.name} will be moved back to Active and reappear on active rosters, attendance and fee collection.` : undefined}
        confirmLabel={busy ? "Reactivating…" : "Reactivate"}
        onConfirm={handleReactivate}
      />
    </div>
  );
}
