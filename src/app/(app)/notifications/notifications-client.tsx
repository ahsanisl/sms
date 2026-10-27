"use client";

import { useMemo } from "react";
import { CheckCheck, CalendarClock, Receipt, Award, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/lib/auth/session-context";
import { useReadNotifications } from "@/lib/notification-read-state";
import { usePersistedString } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

/** Built server-side by build-items.ts; `kind` doubles as the Preferences filter key. */
export interface NotificationItem {
  id: string;
  kind: "attendance" | "fees" | "results" | "events";
  title: string;
  description: string;
  time: string;
}

type Kind = NotificationItem["kind"];
const KINDS: Kind[] = ["attendance", "fees", "results", "events"];

const KIND_STYLE: Record<Kind, { icon: React.ReactNode; tone: string; label: string }> = {
  attendance: { icon: <TriangleAlert size={18} />, tone: "bg-error-container/60 text-error", label: "Attendance alerts" },
  fees: { icon: <Receipt size={18} />, tone: "bg-secondary-fixed text-secondary", label: "Fees & payments" },
  results: { icon: <Award size={18} />, tone: "bg-success-container text-success", label: "Exam results" },
  events: { icon: <CalendarClock size={18} />, tone: "bg-warning-container text-warning", label: "Events & announcements" },
};

export function NotificationsClient({ items: allItems }: { items: NotificationItem[] }) {
  const { user } = useSession();
  const [readIds, markRead] = useReadNotifications(user?.id);
  // Comma-separated list of muted kinds, remembered per browser.
  const [mutedRaw, setMutedRaw] = usePersistedString("eduflow:notification-muted-kinds", "");
  const muted = useMemo(() => new Set(mutedRaw.split(",").filter(Boolean)), [mutedRaw]);

  const items = allItems.filter((i) => !muted.has(i.kind));
  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  function setKindEnabled(kind: Kind, enabled: boolean) {
    const next = new Set(muted);
    if (enabled) next.delete(kind);
    else next.add(kind);
    setMutedRaw([...next].join(","));
  }

  return (
    <div>
      <PageHeader
        title="Notification Center"
        description={unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}
        actions={
          <Button variant="secondary" size="sm" onClick={() => markRead(items.map((i) => i.id))} disabled={unreadCount === 0}>
            <CheckCheck size={16} /> Mark all read
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {items.map((item) => {
            const isRead = readIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead([item.id])}
                aria-label={`${item.title}. ${item.description}${isRead ? "" : " (unread — select to mark as read)"}`}
                className={cn(
                  "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-surface-container-low outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                  isRead ? "border-outline-variant/50 bg-surface-container-lowest" : "border-secondary/30 bg-secondary-fixed/25 card-shadow",
                )}
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", KIND_STYLE[item.kind].tone)}>{KIND_STYLE[item.kind].icon}</div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-body-lg text-on-surface", isRead ? "font-medium" : "font-semibold")}>{item.title}</h3>
                  <p className="mt-0.5 text-body-md text-on-surface-variant">{item.description}</p>
                  <p className="mt-1 text-label-sm text-on-surface-variant">{item.time}</p>
                </div>
                {!isRead && <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />}
              </button>
            );
          })}
          {items.length === 0 && (
            <Card>
              <EmptyState
                icon="notifications"
                title="No notifications"
                description={muted.size ? "Some categories are turned off in Preferences." : "Attendance alerts, payments, results and upcoming events will appear here."}
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Summary" />
            <div className="space-y-2 p-lg pt-md text-body-md">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total</span>
                <span className="font-semibold text-on-surface tabular-nums">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Unread</span>
                <span className="font-semibold text-secondary tabular-nums">{unreadCount}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Preferences" description="Choose what shows here. Saved on this device." />
            <div className="space-y-1 p-sm pt-md">
              {KINDS.map((kind) => (
                <label key={kind} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-container-low">
                  <span className="flex items-center gap-3 text-body-md text-on-surface">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", KIND_STYLE[kind].tone)}>{KIND_STYLE[kind].icon}</span>
                    {KIND_STYLE[kind].label}
                  </span>
                  <Checkbox checked={!muted.has(kind)} onCheckedChange={(c) => setKindEnabled(kind, !!c)} aria-label={KIND_STYLE[kind].label} />
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
