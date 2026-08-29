"use client";

import { useMemo, useState } from "react";
import { CheckCheck, CalendarClock, Receipt, Award, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAnnouncementsStore, useFeesStore, useExamsStore } from "@/lib/store/hooks";
import { useStudents } from "@/lib/store/hooks";
import { classLabel } from "@/lib/mock/reference-data";
import { attendanceForStudent, attendanceRate } from "@/lib/mock/attendance";
import { formatCompactPKR, formatDate, timeAgo } from "@/lib/format";

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  tone: "error" | "secondary" | "success" | "info";
  title: string;
  description: string;
  time: string;
}

export default function NotificationsPage() {
  const { announcements } = useAnnouncementsStore();
  const { payments } = useFeesStore();
  const { exams } = useExamsStore();
  const { students } = useStudents();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState({ attendance: true, fees: true, results: true, events: true });

  const items: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    const lowAttendance = students
      .filter((s) => s.status === "active" && attendanceRate(attendanceForStudent(s.id)) < 80)
      .slice(0, 3);
    lowAttendance.forEach((s) =>
      list.push({
        id: `att-${s.id}`,
        icon: <TriangleAlert size={18} />,
        tone: "error",
        title: "Attendance Alert",
        description: `${s.name} (${classLabel(s.classId)}) has fallen below 80% attendance.`,
        time: "Today",
      }),
    );

    [...payments].slice(0, 3).forEach((p) => {
      const s = students.find((x) => x.id === p.studentId);
      list.push({
        id: `pay-${p.id}`,
        icon: <Receipt size={18} />,
        tone: "secondary",
        title: "Invoice Payment Recorded",
        description: `${formatCompactPKR(p.amount)} received from ${s?.name ?? "a student"}.`,
        time: timeAgo(p.date),
      });
    });

    exams
      .filter((e) => e.status === "completed")
      .slice(0, 2)
      .forEach((e) =>
        list.push({
          id: `exam-${e.id}`,
          icon: <Award size={18} />,
          tone: "success",
          title: "Results Published",
          description: `${e.name} results are now available.`,
          time: formatDate(e.endDate),
        }),
      );

    exams
      .filter((e) => e.status === "scheduled")
      .slice(0, 2)
      .forEach((e) =>
        list.push({
          id: `upcoming-${e.id}`,
          icon: <CalendarClock size={18} />,
          tone: "info",
          title: "Upcoming Event",
          description: `${e.name} begins ${formatDate(e.startDate)}.`,
          time: formatDate(e.startDate),
        }),
      );

    announcements.slice(0, 3).forEach((a) =>
      list.push({
        id: `an-${a.id}`,
        icon: <CalendarClock size={18} />,
        tone: "info",
        title: a.title,
        description: `Published by ${a.author}`,
        time: timeAgo(a.publishedAt),
      }),
    );

    return list;
  }, [students, payments, exams, announcements]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  const toneClasses: Record<NotificationItem["tone"], string> = {
    error: "bg-error-container/50 text-error",
    secondary: "bg-secondary-container/20 text-secondary",
    success: "bg-emerald-100 text-emerald-600",
    info: "bg-primary/10 text-primary",
  };

  return (
    <div>
      <PageHeader
        title="Notification Center"
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setReadIds(new Set(items.map((i) => i.id)))}>
            <CheckCheck size={16} /> Mark all read
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const isRead = readIds.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setReadIds((prev) => new Set(prev).add(item.id))}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors ${
                  isRead ? "border-outline-variant/40 bg-surface" : "border-secondary/30 bg-secondary-container/5"
                } hover:bg-surface-container-low`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toneClasses[item.tone]}`}>{item.icon}</div>
                <div className="flex-1">
                  <h3 className="text-title-lg font-semibold text-on-surface">{item.title}</h3>
                  <p className="text-body-md text-on-surface-variant mt-0.5">{item.description}</p>
                  <p className="text-label-sm text-on-surface-variant mt-1">{item.time}</p>
                </div>
                {!isRead && <span className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />}
              </button>
            );
          })}
          {items.length === 0 && <p className="text-body-md text-on-surface-variant p-6">You&apos;re all caught up.</p>}
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">Summary</h3>
            <div className="flex justify-between text-body-md mb-2">
              <span className="text-on-surface-variant">Total</span>
              <span className="font-semibold text-on-surface">{items.length}</span>
            </div>
            <div className="flex justify-between text-body-md">
              <span className="text-on-surface-variant">Unread</span>
              <span className="font-semibold text-secondary">{unreadCount}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">Preferences</h3>
            <div className="space-y-3">
              {(["attendance", "fees", "results", "events"] as const).map((key) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-body-md text-on-surface capitalize">{key}</span>
                  <Checkbox checked={prefs[key]} onCheckedChange={(c) => setPrefs((p) => ({ ...p, [key]: !!c }))} />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
