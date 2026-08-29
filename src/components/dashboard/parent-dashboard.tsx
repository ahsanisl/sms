"use client";

import Link from "next/link";
import { Avatar } from "@/components/shared/avatar";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session-context";
import { useStudents, useFeesStore } from "@/lib/store/hooks";
import { useAnnouncementsStore } from "@/lib/store/hooks";
import { classLabel } from "@/lib/mock/reference-data";
import { attendanceForStudent, attendanceRate } from "@/lib/mock/attendance";
import { invoicesForStudent } from "@/lib/mock/fees";
import { formatCompactPKR, timeAgo } from "@/lib/format";

export function ParentDashboard() {
  const { user } = useSession();
  const { students } = useStudents();
  const { announcements } = useAnnouncementsStore();
  useFeesStore(); // ensure store subscription so payments update refresh this view

  const children = students.filter((s) => user?.childStudentIds?.includes(s.id));
  const parentAnnouncements = announcements
    .filter((a) => a.audience === "all" || a.audience === "parents")
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-semibold text-primary mb-1">Welcome, {user?.name}</h2>
        <p className="text-body-md text-on-surface-variant">Here&apos;s an overview of your children&apos;s progress.</p>
      </div>

      <div>
        <h3 className="text-title-lg font-semibold text-primary border-b-2 border-primary pb-1 inline-block mb-4">
          My Children
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const rate = attendanceRate(attendanceForStudent(child.id));
            const invoice = invoicesForStudent(child.id).find((i) => i.month === "August 2026");
            const due = invoice ? invoice.totalAmount - invoice.paidAmount : 0;
            return (
              <div key={child.id} className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={child.name} size="lg" />
                  <div>
                    <p className="text-title-lg font-semibold text-on-surface">{child.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{classLabel(child.classId)} · Roll {child.rollNumber}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-label-sm text-on-surface-variant uppercase mb-1">Attendance</p>
                    <p className="text-headline-sm font-semibold text-emerald-600">{rate}%</p>
                  </div>
                  <div>
                    <p className={`text-label-sm uppercase mb-1 ${due > 0 ? "text-on-error-container" : "text-[#166534]"}`}>Fees Due</p>
                    <p className={`text-headline-sm font-semibold ${due > 0 ? "text-error" : "text-emerald-600"}`}>
                      {due > 0 ? formatCompactPKR(due) : "Paid"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" asChild className="flex-1">
                    <Link href={`/students/${child.id}`}>View Profile</Link>
                  </Button>
                  <Button variant="secondary" size="sm" asChild className="flex-1">
                    <Link href="/fees">Fees</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon name="campaign" className="h-5 w-5 text-secondary" /> Announcements
          </h3>
          <div className="space-y-4">
            {parentAnnouncements.map((a) => (
              <div key={a.id} className="border-b border-outline-variant/30 pb-3 last:border-0 last:pb-0">
                <p className="text-body-md font-medium text-on-surface">{a.title}</p>
                <p className="text-label-sm text-on-surface-variant mt-1">{timeAgo(a.publishedAt)}</p>
              </div>
            ))}
          </div>
          <Button variant="link" asChild className="mt-4 w-full justify-center">
            <Link href="/announcements">View All Announcements</Link>
          </Button>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg card-shadow">
          <h3 className="text-title-lg font-semibold text-primary mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/exams" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant p-4 text-center hover:bg-surface-container-low transition-colors">
              <Icon name="grade" className="h-5 w-5 text-secondary" />
              <span className="text-label-md font-medium text-on-surface">Academics</span>
            </Link>
            <Link href="/timetable" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant p-4 text-center hover:bg-surface-container-low transition-colors">
              <Icon name="event" className="h-5 w-5 text-secondary" />
              <span className="text-label-md font-medium text-on-surface">Timetable</span>
            </Link>
            <Link href="/fees" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant p-4 text-center hover:bg-surface-container-low transition-colors">
              <Icon name="payments" className="h-5 w-5 text-secondary" />
              <span className="text-label-md font-medium text-on-surface">Fee Payments</span>
            </Link>
            <Link href="/attendance" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant p-4 text-center hover:bg-surface-container-low transition-colors">
              <Icon name="event_available" className="h-5 w-5 text-secondary" />
              <span className="text-label-md font-medium text-on-surface">Attendance</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
