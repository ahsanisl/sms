"use client";

import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { useSchools } from "@/lib/store/hooks";
import { formatCompactPKR } from "@/lib/format";

export function PlatformAdminDashboard() {
  const { schools, statsFor } = useSchools();
  const activeSchools = schools.filter((s) => s.status === "active");

  const glance = activeSchools.map((school) => ({ school, stats: statsFor(school.id) }));
  const totals = glance.reduce(
    (acc, g) => ({
      campuses: acc.campuses + g.stats.campuses,
      students: acc.students + g.stats.students,
      collected: acc.collected + g.stats.collected,
    }),
    { campuses: 0, students: 0, collected: 0 },
  );

  return (
    <div>
      <h2 className="text-headline-md font-semibold text-on-surface mb-1">Platform Overview</h2>
      <p className="text-on-surface-variant text-body-md mb-6">Every school on this platform, at a glance.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon="corporate_fare" label="Active Schools" value={String(activeSchools.length)} />
        <StatCard icon="business" label="Total Campuses" value={String(totals.campuses)} />
        <StatCard icon="group" label="Total Students" value={String(totals.students)} />
        <StatCard icon="payments" label="Collected (Aug, All Schools)" value={formatCompactPKR(totals.collected)} />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
        <h3 className="text-title-lg font-semibold text-primary mb-4">Schools at a Glance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase">School</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Campuses</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Students</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Teachers</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Collected (Aug)</th>
                <th className="p-3 font-semibold text-label-sm text-on-surface-variant uppercase text-right">Outstanding (Aug)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {glance.map(({ school, stats }) => (
                <tr key={school.id} className="hover:bg-surface-bright transition-colors">
                  <td className="p-3 font-medium text-on-surface">
                    <Link href="/settings/schools" className="flex items-center gap-2 hover:text-secondary hover:underline">
                      <span className="text-lg leading-none">{school.logoEmoji}</span>
                      {school.name}
                    </Link>
                  </td>
                  <td className="p-3 text-right text-on-surface-variant">{stats.campuses}</td>
                  <td className="p-3 text-right text-on-surface-variant">{stats.students}</td>
                  <td className="p-3 text-right text-on-surface-variant">{stats.teachers}</td>
                  <td className="p-3 text-right text-on-surface-variant">{formatCompactPKR(stats.collected)}</td>
                  <td className="p-3 text-right text-error">{formatCompactPKR(stats.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
