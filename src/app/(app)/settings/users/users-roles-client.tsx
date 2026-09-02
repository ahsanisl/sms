"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_LABEL } from "@/lib/nav-config";
import { PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import { updateRolePermissionAction } from "@/app/(app)/settings/users/actions";
import type { PermissionModule, Role } from "@/lib/types";

const ROLES: Role[] = ["school_owner", "school_admin", "campus_admin", "teacher", "accountant", "parent"];
// Every governable permission, not just literal routes — most modules gate a whole
// page (unchecking signs the role out of it immediately), but a few (e.g.
// studentsManage) gate a specific in-page action instead of a route of their own.
const MODULES = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  campusName: string;
}

export function UsersAndRolesClient({
  matrix: initialMatrix,
  users,
  currentRole,
}: {
  matrix: Record<string, Partial<Record<PermissionModule, boolean>>>;
  users: UserRow[];
  currentRole: Role;
}) {
  const [role, setRole] = useState<Role>("teacher");
  const [matrix, setMatrix] = useState(initialMatrix);
  const [isPending, startTransition] = useTransition();

  function toggle(moduleKey: PermissionModule) {
    const next = !matrix[role]?.[moduleKey];
    if (moduleKey === "dashboard" && !next) {
      toast.error("Every role needs Dashboard access — it's where they land after login.");
      return;
    }
    if (!next && moduleKey === "settingsUsers" && role === currentRole) {
      toast.error("You can't remove your own access to Users & Roles — have another admin change this instead.");
      return;
    }

    const previous = matrix;
    // Optimistic: flip the checkbox immediately, roll back on a real failure.
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [moduleKey]: next } }));
    startTransition(async () => {
      const result = await updateRolePermissionAction(role, moduleKey, next);
      if (!result.success) {
        toast.error(result.error);
        setMatrix(previous);
      }
    });
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "User",
      accessor: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} />
          <div>
            <p className="font-semibold text-primary">{u.name}</p>
            <p className="text-label-sm text-on-surface-variant">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (u) => <StatusBadge label={ROLE_LABEL[u.role]} tone="info" /> },
    { key: "campus", header: "Campus", accessor: (u) => u.campusName, className: "text-on-surface-variant" },
    { key: "status", header: "Status", render: () => <StatusBadge label="Active" tone="success" /> },
  ];

  return (
    <div>
      <PageHeader title="Users & Roles" description="Manage staff accounts and role-based page access." />

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm mb-8">
        <div className="p-lg border-b border-outline-variant/40">
          <h3 className="text-title-lg font-semibold text-on-surface">System Roles</h3>
        </div>
        <div className="p-lg">
          <DataTable columns={columns} data={users} rowKey={(u) => u.id} />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
        <div className="p-lg border-b border-outline-variant/40 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h3 className="text-headline-sm font-semibold text-on-surface">
              Page Access: <span className="text-secondary font-bold">{ROLE_LABEL[role]}</span>
            </h3>
            <p className="text-label-sm text-on-surface-variant mt-1">
              This is enforced — unchecking a page signs this role out of it immediately; unchecking an action-only permission hides that action wherever it appears.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-full text-label-md transition-colors ${
                  role === r ? "bg-primary-container text-on-primary-container" : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-md text-label-sm text-on-surface-variant uppercase tracking-wide">Page / Module</th>
                <th className="p-md text-label-sm text-on-surface-variant uppercase tracking-wide text-center w-32">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {MODULES.map((m) => (
                <tr key={m}>
                  <td className="p-md text-body-md font-medium text-on-surface">{PERMISSION_MODULE_LABEL[m]}</td>
                  <td className="p-md text-center">
                    <Checkbox checked={!!matrix[role]?.[m]} disabled={isPending} onCheckedChange={() => toggle(m)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
