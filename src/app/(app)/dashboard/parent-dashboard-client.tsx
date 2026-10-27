"use client";

import Link from "next/link";
import { Avatar } from "@/components/shared/avatar";
import { Icon } from "@/components/shared/icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DashboardHeader, EventList, ProgressBar, rateTone, type DashboardEvent } from "@/components/dashboard/widgets";
import { formatCompactPKR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChildRow {
  id: string;
  name: string;
  classLabel: string;
  rollNumber: string;
  attendanceRate: number;
  feesDue: number;
}

interface AnnouncementRow {
  id: string;
  title: string;
  publishedAt: string;
  important?: boolean;
}

const QUICK_LINKS = [
  { href: "/portal/exams", icon: "grade", label: "Results" },
  { href: "/portal/homework", icon: "assignment", label: "Homework" },
  { href: "/portal/fees", icon: "payments", label: "Fee Payments" },
  { href: "/timetable", icon: "event", label: "Timetable" },
  { href: "/portal/syllabus", icon: "menu_book", label: "Syllabus" },
  { href: "/portal/classwork", icon: "edit_note", label: "Classwork" },
];

export function ParentDashboardClient({
  parentName,
  childRows,
  announcements,
  homeworkDue = [],
}: {
  parentName: string;
  childRows: ChildRow[];
  announcements: AnnouncementRow[];
  homeworkDue?: DashboardEvent[];
}) {
  const totalDue = childRows.reduce((s, c) => s + c.feesDue, 0);

  return (
    <div className="space-y-6">
      <DashboardHeader
        name={parentName}
        subtitle="Here's an overview of your children's progress."
        actions={
          totalDue > 0 ? (
            <Button asChild>
              <Link href="/portal/fees">
                <Icon name="payments" /> View dues · {formatCompactPKR(totalDue)}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <section aria-labelledby="children-heading">
        <h2 id="children-heading" className="mb-3 text-title-lg font-semibold text-primary">
          My children
        </h2>
        {childRows.length === 0 ? (
          <Card>
            <EmptyState icon="face" title="No children linked yet" description="No children are linked to this account. Contact the school office if this looks wrong." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {childRows.map((child) => (
              <Card key={child.id} className="p-lg">
                <div className="mb-5 flex items-center gap-3">
                  <Avatar name={child.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-title-lg font-semibold text-on-surface">{child.name}</p>
                    <p className="text-label-md text-on-surface-variant">
                      Class {child.classLabel} · Roll {child.rollNumber}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-label-md">
                      <span className="text-on-surface-variant">Attendance</span>
                      <span className={cn("font-bold tabular-nums", { success: "text-success", warning: "text-warning", error: "text-error" }[rateTone(child.attendanceRate)])}>{child.attendanceRate}%</span>
                    </div>
                    <ProgressBar value={child.attendanceRate} tone={rateTone(child.attendanceRate)} label={`${child.name} attendance`} />
                  </div>
                  <div className="flex items-center justify-between text-label-md">
                    <span className="text-on-surface-variant">This month&apos;s fees</span>
                    {child.feesDue > 0 ? <StatusBadge label={`${formatCompactPKR(child.feesDue)} due`} tone="error" /> : <StatusBadge label="Paid" tone="success" />}
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" size="sm" asChild className="flex-1">
                    <Link href={`/students/${child.id}`}>View Profile</Link>
                  </Button>
                  <Button variant="secondary" size="sm" asChild className="flex-1">
                    <Link href="/portal/exams">Results</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EventList title="Homework due" description="Upcoming deadlines for your children" events={homeworkDue} emptyText="No upcoming homework deadlines." footer={<Link href="/portal/homework" className="text-label-md font-semibold text-secondary hover:underline">All homework →</Link>} />

        <Card className="flex flex-col">
          <CardHeader title="Announcements" action={<Link href="/announcements" className="text-label-md font-semibold text-secondary hover:underline">View all</Link>} />
          <div className="flex-1 space-y-1 p-sm pt-md">
            {announcements.map((a) => (
              <Link key={a.id} href="/announcements" className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-low">
                <span className="flex items-center gap-2">
                  <span className="truncate text-body-md font-medium text-on-surface">{a.title}</span>
                  {a.important && <StatusBadge label="Important" tone="warning" />}
                </span>
                <span className="mt-0.5 block text-label-sm text-on-surface-variant">{timeAgo(a.publishedAt)}</span>
              </Link>
            ))}
            {announcements.length === 0 && <p className="px-3 py-6 text-center text-body-md text-on-surface-variant">No announcements yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick links" />
          <div className="grid grid-cols-2 gap-3 p-lg pt-md">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col items-start gap-2 rounded-xl border border-outline-variant/70 p-3 transition-colors hover:border-secondary/50 hover:bg-secondary-fixed/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                  <Icon name={link.icon} className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-label-md font-medium text-on-surface">{link.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
