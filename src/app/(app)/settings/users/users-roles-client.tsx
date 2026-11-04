"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Lock, MoreHorizontal, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/shared/avatar";
import { FormField } from "@/components/shared/form-field";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogFooter } from "@/components/ui/dialog";
import { PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import { ALWAYS_ON_MODULES, CUSTOM_ROLE_BASES, SCHOOL_ROLE_MODULES } from "@/lib/school-roles";
import { assignUserRoleAction, createRoleAction, createUserAction, deleteRoleAction, resetUserPasswordAction, updateRoleAction, updateRolePermissionAction } from "@/app/(app)/settings/users/actions";
import type { PermissionModule, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RoleRow {
  id: string;
  name: string;
  description: string;
  baseRole: Role;
  isSystem: boolean;
  userCount: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  baseRole: Role;
  roleId: string | null;
  campusId: string | null;
  teacherId: string | null;
  /** Still on an admin-issued temporary password. */
  mustChangePassword: boolean;
  /** Parent accounts only: how many students they're linked to. */
  childCount: number | null;
}

interface Props {
  roles: RoleRow[];
  matrix: Record<string, Partial<Record<PermissionModule, boolean>>>;
  users: UserRow[];
  campuses: { id: string; name: string }[];
  teachersWithoutLogin: { id: string; name: string; employeeId: string; campusId: string }[];
  currentUserId: string;
  currentRoleId: string | null;
  isOwner: boolean;
}

/** Permission modules grouped the way the sidebar groups the screens they unlock. */
const MODULE_GROUPS: { label: string; modules: PermissionModule[] }[] = [
  { label: "Overview", modules: ["dashboard"] },
  { label: "School Management", modules: ["settingsCampuses", "admissions", "students", "studentsManage", "teachers"] },
  { label: "Daily Operations", modules: ["attendance", "attendanceMark", "timetable", "timetableBuilder", "leave"] },
  { label: "Academics", modules: ["classes", "classesManage", "syllabus", "syllabusManage", "classwork", "classworkCreate", "homework", "homeworkCreate", "exams", "examsCreate", "examsMarks"] },
  { label: "Finance", modules: ["fees", "feesCollect", "feesStructure", "expenses", "expensesApprove", "payroll", "financeReport"] },
  { label: "Communication", modules: ["announcements", "announcementsCreate"] },
  { label: "Insights", modules: ["reports", "auditLog"] },
  { label: "Administration", modules: ["settings", "settingsUsers", "settingsSubjects"] },
];
// Anything new added to PERMISSION_MODULE_LABEL but not placed above still shows up.
const UNGROUPED = SCHOOL_ROLE_MODULES.filter((m) => !MODULE_GROUPS.some((g) => g.modules.includes(m)));
const GROUPS = UNGROUPED.length ? [...MODULE_GROUPS, { label: "Other", modules: UNGROUPED }] : MODULE_GROUPS;

const BASE_LABEL: Record<string, string> = Object.fromEntries(CUSTOM_ROLE_BASES.map((b) => [b.baseRole, b.label]));
const BASE_SCOPE: Record<string, string> = {
  ...Object.fromEntries(CUSTOM_ROLE_BASES.map((b) => [b.baseRole, b.scope])),
  school_owner: "Whole school — unrestricted",
  parent: "Parent portal — own children only",
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function UsersAndRolesClient({ roles, matrix: initialMatrix, users, campuses, teachersWithoutLogin, currentUserId, currentRoleId, isOwner }: Props) {
  const [matrix, setMatrix] = useState(initialMatrix);
  const [selectedRoleId, setSelectedRoleId] = useState(() => roles.find((r) => r.baseRole === "teacher" && r.isSystem)?.id ?? roles[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [roleDialog, setRoleDialog] = useState<{ mode: "create" } | { mode: "edit"; role: RoleRow } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<UserRow | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const campusName = (id: string | null) => (id ? (campuses.find((c) => c.id === id)?.name ?? "—") : "All Campuses");
  const selectedRole = roleById.get(selectedRoleId) ?? roles[0];
  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  function toggle(moduleKey: PermissionModule) {
    if (!selectedRole) return;
    const next = !matrix[selectedRole.id]?.[moduleKey];
    if (!next && ALWAYS_ON_MODULES.includes(moduleKey)) {
      toast.error("Every role needs Dashboard access — it's where they land after login.");
      return;
    }
    if (!next && moduleKey === "settingsUsers" && selectedRole.id === currentRoleId) {
      toast.error("You can't remove your own access to Users & Roles — have another admin change this instead.");
      return;
    }
    const previous = matrix;
    const roleId = selectedRole.id;
    // Optimistic: flip the checkbox immediately, roll back on a real failure.
    setMatrix((prev) => ({ ...prev, [roleId]: { ...prev[roleId], [moduleKey]: next } }));
    startTransition(async () => {
      const result = await updateRolePermissionAction(roleId, moduleKey, next);
      if (!result.success) {
        toast.error(result.error);
        setMatrix(previous);
      }
    });
  }

  const userColumns: Column<UserRow>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      accessor: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-primary">
              {u.name}
              {u.id === currentUserId && <StatusBadge label="You" tone="neutral" />}
              {u.mustChangePassword && <StatusBadge label="Temporary password" tone="warning" />}
            </p>
            <p className="truncate text-label-sm text-on-surface-variant">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      accessor: (u) => roleById.get(u.roleId ?? "")?.name ?? u.baseRole,
      render: (u) => {
        const role = roleById.get(u.roleId ?? "");
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge label={role?.name ?? u.baseRole} tone={role?.baseRole === "school_owner" ? "success" : "info"} />
            {role && !role.isSystem && <span className="text-label-sm text-on-surface-variant">Custom</span>}
          </span>
        );
      },
    },
    {
      key: "campus",
      header: "Campus / Children",
      accessor: (u) => (u.childCount !== null ? `${u.childCount} child${u.childCount === 1 ? "" : "ren"}` : campusName(u.campusId)),
      className: "text-on-surface-variant",
    },
  ];

  function userActions(u: UserRow) {
    const ownerLocked = u.baseRole === "school_owner" && !isOwner;
    const isSelf = u.id === currentUserId;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary" aria-label={`Actions for ${u.name}`}>
          <MoreHorizontal className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[13rem]">
          <DropdownMenuItem disabled={u.baseRole === "parent" || ownerLocked} onClick={() => setAssignTarget(u)}>
            <KeyRound className="h-4 w-4" /> Change role
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isSelf || ownerLocked} onClick={() => setResetTarget(u)}>
            <RotateCcw className="h-4 w-4" /> Reset password
          </DropdownMenuItem>
          {(u.baseRole === "parent" || ownerLocked || isSelf) && (
            <p className="px-2.5 pb-1.5 pt-1 text-label-sm text-on-surface-variant">
              {isSelf ? "Change your own password from My Account." : u.baseRole === "parent" ? "Parent accounts always use the Parent role." : "Only an Owner can manage an Owner's account."}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Users & Roles"
        description="Manage staff accounts, the roles they use, and what each role can access. Roles belong to your school only."
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions ({roles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable
            columns={userColumns}
            data={users}
            rowKey={(u) => u.id}
            searchPlaceholder="Search by name or email…"
            searchKeys={(u) => [u.name, u.email]}
            filters={[{ key: "roleId", label: "All roles", options: roles.map((r) => ({ label: r.name, value: r.id })) }]}
            filterFn={(u, values) => !values.roleId || u.roleId === values.roleId}
            rowActions={userActions}
            toolbarExtra={
              <Button size="sm" onClick={() => setAddUserOpen(true)}>
                <UserPlus /> Add User
              </Button>
            }
            emptyTitle="No users yet"
          />
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
            <Card className="h-fit">
              <div className="p-sm">
                <RoleList title="Default roles" roles={systemRoles} selectedId={selectedRole?.id} onSelect={setSelectedRoleId} />
                <div className="mt-3 border-t border-outline-variant/50 pt-3">
                  <div className="mb-1 flex items-center justify-between px-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Custom roles</p>
                  </div>
                  {customRoles.length === 0 ? (
                    <p className="px-3 py-2 text-label-md text-on-surface-variant">None yet — e.g. a Receptionist who only handles admissions.</p>
                  ) : (
                    <RoleList roles={customRoles} selectedId={selectedRole?.id} onSelect={setSelectedRoleId} />
                  )}
                  <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setRoleDialog({ mode: "create" })}>
                    <Plus /> New Role
                  </Button>
                </div>
              </div>
            </Card>

            {selectedRole && (
              <Card>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {selectedRole.name}
                      {selectedRole.isSystem ? <StatusBadge label="Default" tone="neutral" /> : <StatusBadge label={`Based on ${BASE_LABEL[selectedRole.baseRole] ?? selectedRole.baseRole}`} tone="info" />}
                    </span>
                  }
                  description={
                    <>
                      {selectedRole.description || "No description."}
                      <span className="mt-1 block text-label-md">
                        Sees: {BASE_SCOPE[selectedRole.baseRole] ?? "—"} · {selectedRole.userCount} user{selectedRole.userCount === 1 ? "" : "s"}
                      </span>
                    </>
                  }
                  action={
                    !selectedRole.isSystem && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setRoleDialog({ mode: "edit", role: selectedRole })}>
                          <Pencil /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-error hover:bg-error-container/40 hover:text-error" onClick={() => setDeleteTarget(selectedRole)}>
                          <Trash2 /> Delete
                        </Button>
                      </div>
                    )
                  }
                />
                {selectedRole.baseRole === "school_owner" ? (
                  <div className="m-lg flex items-start gap-3 rounded-lg bg-success-container/50 p-4 text-on-success-container">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <p className="text-body-md">
                      The School Owner role always has full access to everything in your school and can&apos;t be restricted — so no one can lock the Owner out. Only an Owner can make someone else an Owner.
                    </p>
                  </div>
                ) : (
                  <div className="p-lg pt-md">
                    <p className="mb-4 text-label-md text-on-surface-variant">
                      Changes apply immediately. Unchecking a page removes it from this role&apos;s menu and blocks it; unchecking an action (e.g. &quot;Collect Payment&quot;) hides that action wherever it appears.
                    </p>
                    <div className="space-y-5">
                      {GROUPS.map((group) => (
                        <fieldset key={group.label}>
                          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{group.label}</legend>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {group.modules.map((m) => {
                              const checked = !!matrix[selectedRole.id]?.[m];
                              const alwaysOn = ALWAYS_ON_MODULES.includes(m);
                              return (
                                <label
                                  key={m}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                    checked ? "border-secondary/40 bg-secondary-fixed/30" : "border-outline-variant/60 hover:bg-surface-container-low",
                                    alwaysOn && "cursor-not-allowed opacity-70",
                                  )}
                                >
                                  <Checkbox checked={checked} disabled={isPending || alwaysOn} onCheckedChange={() => toggle(m)} />
                                  <span className="text-body-md text-on-surface">{PERMISSION_MODULE_LABEL[m]}</span>
                                  {alwaysOn && <Lock className="ml-auto h-3.5 w-3.5 text-on-surface-variant" aria-label="Always on" />}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {roleDialog && (
        <RoleDialog
          state={roleDialog}
          roles={roles}
          onClose={() => setRoleDialog(null)}
          onCreated={(id) => setSelectedRoleId(id)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={deleteTarget?.userCount ? `${deleteTarget.userCount} user(s) still use this role — move them to another role first.` : "This can't be undone. No users are on this role."}
        confirmLabel="Delete Role"
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          startTransition(async () => {
            const result = await deleteRoleAction(target.id);
            if (!result.success) toast.error(result.error);
            else {
              toast.success(`Deleted "${target.name}".`);
              setSelectedRoleId(roles.find((r) => r.isSystem)?.id ?? "");
            }
          });
        }}
      />

      {resetTarget && <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />}
      {assignTarget && <AssignRoleDialog user={assignTarget} roles={roles} campuses={campuses} isOwner={isOwner} onClose={() => setAssignTarget(null)} />}
      {addUserOpen && <AddUserDialog roles={roles} campuses={campuses} teachers={teachersWithoutLogin} isOwner={isOwner} onClose={() => setAddUserOpen(false)} />}
    </div>
  );
}

function RoleList({ title, roles, selectedId, onSelect }: { title?: string; roles: RoleRow[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div>
      {title && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{title}</p>}
      <ul className="space-y-0.5">
        {roles.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              aria-current={r.id === selectedId ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-body-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                r.id === selectedId ? "bg-secondary-fixed font-semibold text-on-secondary-fixed" : "text-on-surface hover:bg-surface-container-low",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {r.baseRole === "school_owner" && <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                <span className="truncate">{r.name}</span>
              </span>
              <span className="shrink-0 text-label-sm text-on-surface-variant tabular-nums">{r.userCount}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleDialog({ state, roles, onClose, onCreated }: { state: { mode: "create" } | { mode: "edit"; role: RoleRow }; roles: RoleRow[]; onClose: () => void; onCreated: (id: string) => void }) {
  const editing = state.mode === "edit" ? state.role : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [baseRole, setBaseRole] = useState<Role>("school_admin");
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const copyChoices = roles.filter((r) => r.baseRole !== "parent");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = editing ? await updateRoleAction(editing.id, { name, description }) : await createRoleAction({ name, description, baseRole, copyFromRoleId: copyFrom || undefined });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't save the role.");
      return;
    }
    toast.success(editing ? "Role updated." : `Created "${name.trim()}". Now choose what it can access.`);
    if (!editing && result.id) onCreated(result.id);
    onClose();
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title={editing ? `Edit "${editing.name}"` : "New Role"} description={editing ? undefined : "Create a role with exactly the access a job needs — e.g. a Receptionist, Exam Coordinator or Librarian."} className="max-w-[36rem]">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Role Name" htmlFor="roleName" required>
          <Input id="roleName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Receptionist" autoFocus maxLength={50} />
        </FormField>
        <FormField label="Description" htmlFor="roleDescription">
          <Textarea id="roleDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this role is for" maxLength={200} />
        </FormField>
        {!editing && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-label-md font-medium text-on-surface">
                Based on <span className="text-error">*</span>
              </legend>
              <p className="mb-2 text-label-sm text-on-surface-variant">Decides whose data the role sees and which dashboard it gets. This can&apos;t be changed later.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CUSTOM_ROLE_BASES.map((b) => (
                  <label key={b.baseRole} className={cn("cursor-pointer rounded-lg border p-3 transition-colors", baseRole === b.baseRole ? "border-secondary bg-secondary-fixed/40" : "border-outline-variant hover:bg-surface-container-low")}>
                    <input type="radio" name="baseRole" value={b.baseRole} checked={baseRole === b.baseRole} onChange={() => setBaseRole(b.baseRole)} className="sr-only" />
                    <span className="block text-body-md font-semibold text-on-surface">{b.label}</span>
                    <span className="block text-label-md text-on-surface-variant">{b.scope}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="Start with permissions from" htmlFor="copyFrom" hint="You can fine-tune every permission after creating the role.">
              <Select id="copyFrom" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="w-full">
                <option value="">Default {CUSTOM_ROLE_BASES.find((b) => b.baseRole === baseRole)?.label} permissions</option>
                {copyChoices.map((r) => (
                  <option key={r.id} value={r.id}>Copy of {r.name}</option>
                ))}
              </Select>
            </FormField>
          </>
        )}
        {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || name.trim().length < 2}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Role"}</Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}

/** Role picker shared by Change Role and Add User — Owner only offered to Owners, Parent never (parents are linked from student records). */
function RoleSelect({ roles, value, onChange, isOwner }: { roles: RoleRow[]; value: string; onChange: (id: string) => void; isOwner: boolean }) {
  const choices = roles.filter((r) => r.baseRole !== "parent" && (isOwner || r.baseRole !== "school_owner"));
  return (
    <Select id="roleId" value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
      <option value="" disabled>Choose a role…</option>
      <optgroup label="Default roles">
        {choices.filter((r) => r.isSystem).map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </optgroup>
      {choices.some((r) => !r.isSystem) && (
        <optgroup label="Custom roles">
          {choices.filter((r) => !r.isSystem).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </optgroup>
      )}
    </Select>
  );
}

function AssignRoleDialog({ user, roles, campuses, isOwner, onClose }: { user: UserRow; roles: RoleRow[]; campuses: { id: string; name: string }[]; isOwner: boolean; onClose: () => void }) {
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const [campusId, setCampusId] = useState(user.campusId ?? campuses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const role = roles.find((r) => r.id === roleId);
  const needsCampus = role?.baseRole === "campus_admin";
  const needsTeacher = role?.baseRole === "teacher" && !user.teacherId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await assignUserRoleAction(user.id, { roleId, campusId: needsCampus ? campusId : null });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't change the role.");
      return;
    }
    toast.success(`${user.name} is now ${role?.name}.`);
    onClose();
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title={`Change role — ${user.name}`} description="Takes effect on their next page load; they don't need to sign out.">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Role" htmlFor="roleId" required hint={role ? `Sees: ${BASE_SCOPE[role.baseRole] ?? "—"}` : undefined}>
          <RoleSelect roles={roles} value={roleId} onChange={setRoleId} isOwner={isOwner} />
        </FormField>
        {needsCampus && (
          <FormField label="Campus" htmlFor="campusId" required>
            <Select id="campusId" value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full">
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {needsTeacher && (
          <p role="alert" className="rounded-lg bg-warning-container/70 px-3 py-2 text-body-md text-on-warning-container">
            This is a teacher role, but this account isn&apos;t linked to a teacher profile. Teacher roles can only be given to teachers&apos; own logins.
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || !roleId || (roleId === user.roleId && !needsCampus) || needsTeacher}>{saving ? "Saving…" : "Change Role"}</Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}

function AddUserDialog({
  roles,
  campuses,
  teachers,
  isOwner,
  onClose,
}: {
  roles: RoleRow[];
  campuses: { id: string; name: string }[];
  teachers: { id: string; name: string; employeeId: string; campusId: string }[];
  isOwner: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [roleId, setRoleId] = useState("");
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const role = roles.find((r) => r.id === roleId);
  const needsCampus = role?.baseRole === "campus_admin";
  const needsTeacher = role?.baseRole === "teacher";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createUserAction({
      name,
      email,
      password,
      roleId,
      campusId: needsCampus ? campusId : needsTeacher ? (teachers.find((t) => t.id === teacherId)?.campusId ?? null) : null,
      teacherId: needsTeacher ? teacherId || null : null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't create the account.");
      return;
    }
    toast.success(`Account created for ${name.trim()}. Share the temporary password securely — they'll choose their own at first sign-in.`);
    onClose();
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title="Add User" description="Create a staff login. Parent logins are linked to their children from the student's record." className="max-w-[36rem]">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="newUserName" required>
            <Input id="newUserName" value={name} onChange={(e) => setName(e.target.value)} autoFocus autoComplete="off" />
          </FormField>
          <FormField label="Email" htmlFor="newUserEmail" required hint="They'll sign in with this.">
            <Input id="newUserEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
        <FormField label="Role" htmlFor="roleId" required hint={role ? `Sees: ${BASE_SCOPE[role.baseRole] ?? "—"}` : undefined}>
          <RoleSelect roles={roles} value={roleId} onChange={setRoleId} isOwner={isOwner} />
        </FormField>
        {needsCampus && (
          <FormField label="Campus" htmlFor="newUserCampus" required>
            <Select id="newUserCampus" value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full">
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {needsTeacher && (
          <FormField label="Teacher Profile" htmlFor="newUserTeacher" required hint={teachers.length ? "The staff record this login belongs to." : undefined}>
            {teachers.length ? (
              <Select id="newUserTeacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full">
                <option value="" disabled>Choose a teacher…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                ))}
              </Select>
            ) : (
              <p className="rounded-lg bg-warning-container/70 px-3 py-2 text-body-md text-on-warning-container">Every active teacher already has a login. Add the teacher under Teachers first.</p>
            )}
          </FormField>
        )}
        <FormField label="Temporary Password" htmlFor="newUserPassword" required hint="At least 8 characters. Copy it now and share it with them securely.">
          <div className="flex gap-2">
            <Input id="newUserPassword" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" autoComplete="new-password" />
            <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())}>New</Button>
          </div>
        </FormField>
        {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || !name.trim() || !email.trim() || !roleId || password.length < 8 || (needsTeacher && !teacherId)}>
            {saving ? "Creating…" : "Create Account"}
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}

/** Two steps: confirm, then show the new temporary password exactly once (it's never stored in plain text). */
function ResetPasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reset() {
    setWorking(true);
    setError(null);
    const result = await resetUserPasswordAction(user.id);
    setWorking(false);
    if (!result.success || !result.temporaryPassword) {
      setError(result.error ?? "Couldn't reset the password.");
      return;
    }
    setPassword(result.temporaryPassword);
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy — select the password and copy it manually.");
    }
  }

  return (
    <Modal open onOpenChange={(open) => !open && !working && onClose()} title={password ? "Temporary password created" : `Reset password — ${user.name}`}>
      {password ? (
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Give this to <span className="font-semibold text-on-surface">{user.name}</span> ({user.email}). They&apos;ll be asked to choose their own password when they sign in. <span className="font-semibold text-on-surface">It won&apos;t be shown again.</span>
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <code className="flex-1 select-all break-all font-mono text-title-lg tracking-wider text-primary">{password}</code>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Their current password stops working immediately. You&apos;ll get a temporary password to pass on, and they&apos;ll choose a new one at their next sign-in.
          </p>
          {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={working}>Cancel</Button>
            <Button variant="destructive" onClick={reset} disabled={working}>{working ? "Resetting…" : "Reset Password"}</Button>
          </DialogFooter>
        </div>
      )}
    </Modal>
  );
}
