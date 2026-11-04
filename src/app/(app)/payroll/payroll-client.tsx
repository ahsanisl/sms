"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronRight, MoreVertical, Pencil, Play, Plus, UserPlus } from "lucide-react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createProfileAction, createRunAction, setProfileArchivedAction, updateProfileAction } from "@/app/(app)/payroll/actions";
import { addMonthsToKey, currentMonthKey, monthKeyLabel, monthlyIncomeTax, type TaxSlab } from "@/lib/finance";
import { TaxAndLeave, type UnpaidLeaveRow } from "@/app/(app)/payroll/tax-and-leave";
import { formatCompactPKR, formatPKR } from "@/lib/format";

export interface RunRow {
  id: string;
  month: string;
  status: "draft" | "finalized";
  staffCount: number;
  totalNet: number;
  paidNet: number;
  paidCount: number;
}

export interface ProfileRow {
  id: string;
  name: string;
  designation: string;
  campusId: string;
  campusName: string;
  teacherId: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bankAccount: string;
  autoIncomeTax: boolean;
  status: "active" | "archived";
}

interface TeacherOption {
  id: string;
  name: string;
  campusId: string;
  hasSalary: boolean;
}

interface PayrollClientProps {
  initialTab: "runs" | "staff" | "tax";
  taxSlabs: TaxSlab[] | null;
  unpaidLeave: UnpaidLeaveRow[];
  runs: RunRow[];
  profiles: ProfileRow[];
  teachers: TeacherOption[];
  campuses: { id: string; name: string }[];
  /** Whole-school roles set salaries and run payroll; campus-limited ones only view and mark paid. */
  canManage: boolean;
}

export function runStatus(run: Pick<RunRow, "status" | "paidCount" | "staffCount">): { label: string; tone: "neutral" | "warning" | "success" | "info" } {
  if (run.status === "draft") return { label: "Draft", tone: "neutral" };
  if (run.staffCount > 0 && run.paidCount === run.staffCount) return { label: "Paid", tone: "success" };
  if (run.paidCount > 0) return { label: `${run.paidCount} of ${run.staffCount} paid`, tone: "info" };
  return { label: "Finalized · unpaid", tone: "warning" };
}

export function PayrollClient({ initialTab, runs, profiles, teachers, campuses, canManage, taxSlabs, unpaidLeave }: PayrollClientProps) {
  /** Monthly take-home before leave and bonuses: basic + allowances − fixed deductions − income tax (when withheld). */
  const monthlyNet = (p: ProfileRow) => Math.max(0, p.basicSalary + p.allowances - p.deductions - (p.autoIncomeTax ? monthlyIncomeTax(p.basicSalary, p.allowances, taxSlabs) : 0));
  const router = useLoadingRouter();
  const [tab, setTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const [runOpen, setRunOpen] = useState(false);
  const thisMonth = currentMonthKey();
  const existingMonths = new Set(runs.map((r) => r.month));
  const monthChoices = [-2, -1, 0, 1].map((offset) => addMonthsToKey(thisMonth, offset)).filter((m) => !existingMonths.has(m));
  const [runMonth, setRunMonth] = useState(monthChoices.includes(thisMonth) ? thisMonth : (monthChoices[0] ?? ""));

  const [profileDialog, setProfileDialog] = useState<{ mode: "add" } | { mode: "edit"; profile: ProfileRow } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeProfiles = profiles.filter((p) => p.status === "active");
  const monthlyBill = activeProfiles.reduce((s, p) => s + monthlyNet(p), 0);
  const teachersWithoutSalary = teachers.filter((t) => !t.hasSalary);
  const currentRun = runs.find((r) => r.month === thisMonth);
  const owed = runs.filter((r) => r.status === "finalized").reduce((s, r) => s + (r.totalNet - r.paidNet), 0);

  function act(action: () => Promise<{ success: boolean; error?: string; id?: string }>, message: string, after?: (id?: string) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      after?.(result.id);
      router.refresh();
    });
  }

  const profileColumns: Column<ProfileRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      accessor: (p) => p.name,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-on-surface">
            {p.name}
            {p.teacherId && <span className="ml-2 align-middle"><StatusBadge label="Teacher" tone="info" /></span>}
          </p>
          <p className="truncate text-label-sm text-on-surface-variant">{p.designation || "—"}</p>
        </div>
      ),
    },
    { key: "campus", header: "Campus", sortable: true, accessor: (p) => p.campusName, render: (p) => <span className="text-on-surface-variant">{p.campusName}</span> },
    { key: "basic", header: "Basic", sortable: true, accessor: (p) => p.basicSalary, className: "text-right", render: (p) => <span className="tabular-nums">{formatPKR(p.basicSalary)}</span> },
    { key: "allowances", header: "Allowances", sortable: true, accessor: (p) => p.allowances, className: "text-right", render: (p) => <span className="tabular-nums text-on-surface-variant">{p.allowances ? formatPKR(p.allowances) : "—"}</span> },
    { key: "deductions", header: "Deductions", sortable: true, accessor: (p) => p.deductions, className: "text-right", render: (p) => <span className="tabular-nums text-on-surface-variant">{p.deductions ? `− ${formatPKR(p.deductions)}` : "—"}</span> },
    {
      key: "net",
      header: "Monthly net",
      sortable: true,
      accessor: (p) => monthlyNet(p),
      className: "text-right",
      render: (p) => (
        <span className="font-semibold tabular-nums text-on-surface" title={p.autoIncomeTax ? `After ${formatPKR(monthlyIncomeTax(p.basicSalary, p.allowances, taxSlabs))} income tax` : undefined}>
          {formatPKR(monthlyNet(p))}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Salaries"
        description="Staff pay, monthly payroll and payslips. Approved unpaid leave is deducted automatically."
        actions={
          canManage ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setProfileDialog({ mode: "add" })}>
                <UserPlus /> Add Staff Salary
              </Button>
              <Button size="sm" onClick={() => setRunOpen(true)} disabled={monthChoices.length === 0 || activeProfiles.length === 0}>
                <Play /> Run Payroll
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Staff on payroll" value={String(activeProfiles.length)} icon="groups" trend={teachersWithoutSalary.length && canManage ? { direction: "flat", label: `${teachersWithoutSalary.length} teacher${teachersWithoutSalary.length === 1 ? "" : "s"} without a salary` } : undefined} />
        <StatCard label="Monthly salary bill" value={formatCompactPKR(monthlyBill)} icon="badge_dollar" trend={{ direction: "flat", label: "before leave & bonuses" }} />
        <StatCard
          label={monthKeyLabel(thisMonth)}
          value={currentRun ? runStatus(currentRun).label : "Not run yet"}
          icon="calendar_month"
          tone={!currentRun ? "default" : currentRun.paidCount === currentRun.staffCount && currentRun.status === "finalized" ? "success" : "warning"}
          href={currentRun ? `/payroll/${currentRun.id}` : undefined}
        />
        <StatCard label="Finalized, not yet paid" value={formatCompactPKR(owed)} icon="pending_actions" tone={owed > 0 ? "warning" : "default"} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="runs">Monthly Payroll ({runs.length})</TabsTrigger>
          <TabsTrigger value="staff">Staff Salaries ({activeProfiles.length})</TabsTrigger>
          <TabsTrigger value="tax">Tax &amp; Unpaid Leave</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="pt-4">
          {runs.length === 0 ? (
            <Card>
              <EmptyState
                icon="badge_dollar"
                title="No payroll yet"
                description={activeProfiles.length === 0 ? "Start by adding each staff member's salary in the Staff Salaries tab." : "Run payroll for a month to create everyone's payslips."}
                actionLabel={canManage ? (activeProfiles.length === 0 ? "Add Staff Salary" : "Run Payroll") : undefined}
                onAction={canManage ? () => (activeProfiles.length === 0 ? setProfileDialog({ mode: "add" }) : setRunOpen(true)) : undefined}
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-outline-variant/40">
                {runs.map((r) => {
                  const status = runStatus(r);
                  return (
                    <li key={r.id}>
                      <Link href={`/payroll/${r.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low/60">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-on-surface">{monthKeyLabel(r.month)}</p>
                          <p className="text-label-sm text-on-surface-variant">{r.staffCount} staff</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-on-surface">{formatPKR(r.totalNet)}</p>
                          {r.status === "finalized" && r.paidNet < r.totalNet && <p className="text-label-sm text-on-surface-variant tabular-nums">{formatPKR(r.totalNet - r.paidNet)} to pay</p>}
                        </div>
                        <StatusBadge label={status.label} tone={status.tone} className="hidden sm:inline-flex" />
                        <ChevronRight size={16} className="text-on-surface-variant" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="pt-4">
          {canManage && teachersWithoutSalary.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-container/40 px-3 py-2 text-label-md text-on-warning-container">
              <span>
                No salary set up yet for: {teachersWithoutSalary.slice(0, 4).map((t) => t.name).join(", ")}
                {teachersWithoutSalary.length > 4 ? ` and ${teachersWithoutSalary.length - 4} more` : ""}.
              </span>
              <Button size="sm" variant="secondary" onClick={() => setProfileDialog({ mode: "add" })}>
                <Plus /> Add
              </Button>
            </div>
          )}
          <Card>
            <DataTable
              columns={profileColumns}
              data={profiles.filter((p) => (showArchived ? p.status === "archived" : p.status === "active"))}
              rowKey={(p) => p.id}
              searchPlaceholder="Search staff…"
              searchKeys={(p) => [p.name, p.designation]}
              filters={campuses.length > 1 ? [{ key: "campus", label: "Campus", options: [{ value: "school", label: "Whole school" }, ...campuses.map((c) => ({ value: c.id, label: c.name }))] }] : undefined}
              filterFn={(p, v) => !v.campus || (v.campus === "school" ? p.campusId === "" : p.campusId === v.campus)}
              pageSize={15}
              toolbarExtra={
                profiles.some((p) => p.status === "archived") ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
                    {showArchived ? "Show current staff" : "Show archived"}
                  </Button>
                ) : undefined
              }
              emptyTitle={showArchived ? "No archived salaries" : "No staff on the payroll yet"}
              emptyDescription={showArchived ? undefined : "Add each teacher's and staff member's monthly salary to run payroll."}
              rowActions={
                canManage
                  ? (p) => (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" aria-label={`Actions for ${p.name}`}>
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setProfileDialog({ mode: "edit", profile: p })}>
                            <Pencil size={14} /> Edit salary
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => act(() => setProfileArchivedAction(p.id, p.status === "active"), p.status === "active" ? `${p.name} removed from future payrolls.` : `${p.name} is back on the payroll.`)}>
                            {p.status === "active" ? <Archive size={14} /> : <ArchiveRestore size={14} />} {p.status === "active" ? "Remove from payroll" : "Restore"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  : undefined
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="pt-4">
          <TaxAndLeave
            slabs={taxSlabs}
            leave={unpaidLeave}
            staff={activeProfiles.map((p) => ({ id: p.id, name: p.name, isTeacher: !!p.teacherId }))}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>

      <Modal open={runOpen} onOpenChange={setRunOpen} title="Run Payroll" description="Creates a draft payslip for everyone on the payroll. You can adjust bonuses and deductions before finalizing." className="max-w-[28rem]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!runMonth) return;
            act(() => createRunAction(runMonth), `Payroll for ${monthKeyLabel(runMonth)} created.`, (id) => {
              setRunOpen(false);
              if (id) router.push(`/payroll/${id}`);
            });
          }}
        >
          <FormField label="Month" htmlFor="run-month" required>
            <Select id="run-month" value={runMonth} onChange={(e) => setRunMonth(e.target.value)} className="w-full">
              {monthChoices.map((m) => (
                <option key={m} value={m}>{monthKeyLabel(m)}</option>
              ))}
            </Select>
          </FormField>
          <p className="text-label-md text-on-surface-variant">
            {activeProfiles.length} staff · about {formatPKR(monthlyBill)} before unpaid leave.
          </p>
          <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !runMonth}>{isPending ? "Creating…" : "Create Payroll"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!profileDialog}
        onOpenChange={(open) => !open && setProfileDialog(null)}
        title={profileDialog?.mode === "edit" ? `Edit Salary — ${profileDialog.profile.name}` : "Add Staff Salary"}
        description={profileDialog?.mode === "edit" ? "Changes apply from the next payroll you create; past payslips keep their amounts." : undefined}
        className="max-w-[36rem]"
      >
        {profileDialog && (
          <ProfileForm
            key={profileDialog.mode === "edit" ? profileDialog.profile.id : "new"}
            initial={profileDialog.mode === "edit" ? profileDialog.profile : undefined}
            teachers={teachers}
            campuses={campuses}
            taxSlabs={taxSlabs}
            submitting={isPending}
            onCancel={() => setProfileDialog(null)}
            onSubmit={(values) =>
              profileDialog.mode === "edit"
                ? act(() => updateProfileAction(profileDialog.profile.id, values), "Salary updated.", () => setProfileDialog(null))
                : act(() => createProfileAction(values), `${values.name}'s salary added.`, () => setProfileDialog(null))
            }
          />
        )}
      </Modal>
    </div>
  );
}

interface ProfileValues {
  teacherId: string;
  campusId: string;
  name: string;
  designation: string;
  basicSalary: string;
  allowances: string;
  deductions: string;
  bankAccount: string;
  autoIncomeTax: boolean;
}

function ProfileForm({
  initial,
  teachers,
  campuses,
  taxSlabs,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: ProfileRow;
  teachers: TeacherOption[];
  campuses: { id: string; name: string }[];
  taxSlabs: TaxSlab[] | null;
  submitting: boolean;
  onSubmit: (values: ProfileValues) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"teacher" | "staff">(initial ? (initial.teacherId ? "teacher" : "staff") : teachers.some((t) => !t.hasSalary) ? "teacher" : "staff");
  const [values, setValues] = useState<ProfileValues>({
    teacherId: initial?.teacherId ?? "",
    campusId: initial?.campusId ?? "",
    name: initial?.name ?? "",
    designation: initial?.designation ?? "",
    basicSalary: initial ? String(initial.basicSalary) : "",
    allowances: initial ? String(initial.allowances) : "0",
    deductions: initial ? String(initial.deductions) : "0",
    bankAccount: initial?.bankAccount ?? "",
    autoIncomeTax: initial?.autoIncomeTax ?? !!taxSlabs?.length,
  });
  const [error, setError] = useState("");
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const teacherChoices = teachers.filter((t) => !t.hasSalary || t.id === initial?.teacherId);
  const money = (v: string) => Number(v || 0);
  const tax = values.autoIncomeTax ? monthlyIncomeTax(money(values.basicSalary), money(values.allowances), taxSlabs) : 0;
  const net = Math.max(0, money(values.basicSalary) + money(values.allowances) - money(values.deductions) - tax);

  function pickTeacher(id: string) {
    const teacher = teachers.find((t) => t.id === id);
    setValues((v) => ({ ...v, teacherId: id, name: teacher?.name ?? v.name, campusId: teacher?.campusId ?? v.campusId, designation: v.designation || "Teacher" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "teacher" && !values.teacherId) return setError("Choose the teacher.");
    if (!values.name.trim()) return setError("Enter the staff member's name.");
    if (!money(values.basicSalary)) return setError("Enter the basic monthly salary.");
    setError("");
    onSubmit({ ...values, teacherId: kind === "teacher" ? values.teacherId : "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!initial && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is this salary for?">
          {(["teacher", "staff"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-2 text-left text-label-md transition-colors ${kind === k ? "border-secondary bg-secondary-fixed/40 text-on-secondary-fixed" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
            >
              <span className="block font-semibold">{k === "teacher" ? "A teacher" : "Other staff"}</span>
              <span className="text-label-sm">{k === "teacher" ? "Unpaid leave is deducted automatically" : "Office, guards, drivers, cleaners…"}</span>
            </button>
          ))}
        </div>
      )}
      {kind === "teacher" ? (
        <FormField label="Teacher" htmlFor="profile-teacher" required>
          <Select id="profile-teacher" value={values.teacherId} onChange={(e) => pickTeacher(e.target.value)} className="w-full">
            <option value="">{teacherChoices.length ? "Choose a teacher…" : "Every teacher already has a salary"}</option>
            {teacherChoices.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </FormField>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="profile-name" required>
            <Input id="profile-name" value={values.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Campus" htmlFor="profile-campus">
            <Select id="profile-campus" value={values.campusId} onChange={(e) => set("campusId", e.target.value)} className="w-full">
              <option value="">Whole school</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
      )}
      <FormField label="Designation" htmlFor="profile-designation">
        <Input id="profile-designation" value={values.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Senior Teacher, Accountant, Security Guard" />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Basic salary (Rs.)" htmlFor="profile-basic" required>
          <Input id="profile-basic" inputMode="numeric" value={values.basicSalary} onChange={(e) => set("basicSalary", e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
        <FormField label="Allowances" htmlFor="profile-allowances" hint="House rent, conveyance…">
          <Input id="profile-allowances" inputMode="numeric" value={values.allowances} onChange={(e) => set("allowances", e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
        <FormField label="Fixed deductions" htmlFor="profile-deductions" hint="Provident fund, EOBI, loan…">
          <Input id="profile-deductions" inputMode="numeric" value={values.deductions} onChange={(e) => set("deductions", e.target.value.replace(/[^\d]/g, ""))} />
        </FormField>
      </div>
      <FormField label="Bank account (optional)" htmlFor="profile-bank" hint="Printed on the payslip and the bank transfer sheet.">
        <Input id="profile-bank" value={values.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="e.g. Meezan Bank 0123-4567890" />
      </FormField>
      <label className="flex items-start gap-2 text-body-md">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-secondary)]" checked={values.autoIncomeTax} onChange={(e) => set("autoIncomeTax", e.target.checked)} />
        <span>
          Withhold income tax automatically
          <span className="block text-label-sm text-on-surface-variant">
            {taxSlabs?.length ? "Calculated each month from the school's tax brackets (Tax & Unpaid Leave tab)." : "Set up the tax brackets first (Tax & Unpaid Leave tab) — until then no tax is calculated."}
          </span>
        </span>
      </label>
      <p className="rounded-lg bg-surface-container-low px-3 py-2 text-body-md">
        Monthly net pay: <span className="font-semibold tabular-nums">{formatPKR(net)}</span>
        {tax > 0 && <span className="text-label-sm text-on-surface-variant"> · after {formatPKR(tax)} income tax</span>}
      </p>
      {error && <p className="text-label-md text-error">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : initial ? "Save Salary" : "Add Salary"}</Button>
      </div>
    </form>
  );
}
