"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Avatar } from "@/components/shared/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useStudents, usePermissions, useCampuses } from "@/lib/store/hooks";
import { useSession } from "@/lib/auth/session-context";
import { useCampusScope } from "@/lib/campus-scope";
import { classLabel, campusName } from "@/lib/mock/reference-data";
import { formatDate } from "@/lib/format";
import type { Student } from "@/lib/types";

export default function AlumniDirectoryPage() {
  const router = useRouter();
  const { students, lifecycleEvents, reactivateStudent } = useStudents();
  const { campuses } = useCampuses();
  const { user } = useSession();
  const { routePermissions } = usePermissions();
  const { scopedCampusId, isAllCampuses } = useCampusScope();
  const canManage = !!user && !!routePermissions[user.role]?.studentsManage;
  const [reactivating, setReactivating] = useState<Student | null>(null);

  const alumni = students.filter((s) => s.status === "alumni" && (!scopedCampusId || s.campusId === scopedCampusId));
  const activeCampuses = campuses.filter((c) => c.status === "active" && (!scopedCampusId || c.id === scopedCampusId));

  function graduatedOn(studentId: string) {
    const events = lifecycleEvents.filter((e) => e.studentId === studentId && e.resultingStatus === "alumni");
    const latest = [...events].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return latest?.date;
  }

  function handleReactivate() {
    if (!reactivating) return;
    reactivateStudent({ studentId: reactivating.id, date: new Date().toISOString().slice(0, 10), reason: "Reactivated from Alumni Directory" });
    toast.success(`${reactivating.name} was reactivated.`);
    setReactivating(null);
  }

  const columns: Column<Student>[] = [
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
    { key: "lastClass", header: "Last Class", accessor: (s) => classLabel(s.classId), className: "text-on-surface-variant" },
    { key: "campus", header: "Campus", accessor: (s) => campusName(s.campusId), className: "text-on-surface-variant" },
    {
      key: "graduatedOn",
      header: "Graduated On",
      accessor: (s) => graduatedOn(s.id) ?? "",
      render: (s) => {
        const date = graduatedOn(s.id);
        return date ? formatDate(date) : "—";
      },
      className: "text-on-surface-variant whitespace-nowrap",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Alumni Directory"
        description={isAllCampuses ? "Former students who have graduated, kept separate from the active roster." : "Former students who have graduated from this campus."}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Alumni" value={String(alumni.length)} icon="school" />
        {isAllCampuses &&
          activeCampuses.slice(0, 3).map((c) => (
            <StatCard key={c.id} label={c.name} value={String(alumni.filter((s) => s.campusId === c.id).length)} icon="business" />
          ))}
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
        confirmLabel="Reactivate"
        onConfirm={handleReactivate}
      />
    </div>
  );
}
