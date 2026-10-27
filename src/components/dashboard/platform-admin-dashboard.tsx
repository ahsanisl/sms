"use client";

import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/shared/icon";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { formatCompactPKR } from "@/lib/format";

interface SchoolGlanceRow {
  id: string;
  name: string;
  logoEmoji: string;
  campuses: number;
  students: number;
  teachers: number;
  collected: number;
  outstanding: number;
}

interface PlatformAdminDashboardProps {
  userName: string;
  totalActiveSchools: number;
  archivedSchools: number;
  totals: { campuses: number; students: number; collected: number };
  schools: SchoolGlanceRow[];
}

export function PlatformAdminDashboard({ userName, totalActiveSchools, archivedSchools, totals, schools }: PlatformAdminDashboardProps) {
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return (
    <div className="space-y-6">
      <DashboardHeader
        name={userName}
        subtitle="Every school on this platform, at a glance."
        actions={
          <Button asChild>
            <Link href="/settings/schools">
              <Icon name="corporate_fare" /> Manage Schools
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="corporate_fare" label="Active Schools" value={String(totalActiveSchools)} href="/settings/schools" trend={archivedSchools ? { direction: "flat", label: `${archivedSchools} archived` } : undefined} />
        <StatCard icon="business" label="Total Campuses" value={String(totals.campuses)} />
        <StatCard icon="group" label="Total Students" value={totals.students.toLocaleString()} />
        <StatCard icon="payments" tone="success" label="Collected (All Schools)" value={formatCompactPKR(totals.collected)} trend={{ direction: "flat", label: monthLabel }} />
      </div>

      <Card>
        <CardHeader title="Schools at a glance" description="Active schools, sorted by enrolment" />
        {schools.length === 0 ? (
          <EmptyState icon="corporate_fare" title="No active schools yet" description="Create the first school to get started." actionLabel="Add a school" actionHref="/settings/schools" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-outline-variant/50 bg-surface-container-low/60">
                  <th scope="col" className="px-lg py-3 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">School</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Campuses</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Students</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Teachers</th>
                  <th scope="col" className="px-4 py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Collected</th>
                  <th scope="col" className="px-lg py-3 text-right text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {[...schools]
                  .sort((a, b) => b.students - a.students)
                  .map((school) => (
                    <tr key={school.id} className="transition-colors hover:bg-surface-container-low/60">
                      <td className="px-lg py-3 font-medium text-on-surface">
                        <span className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-lg leading-none">{school.logoEmoji}</span>
                          {school.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{school.campuses}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{school.students.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{school.teachers}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">{formatCompactPKR(school.collected)}</td>
                      <td className="px-lg py-3 text-right tabular-nums text-error">{formatCompactPKR(school.outstanding)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
