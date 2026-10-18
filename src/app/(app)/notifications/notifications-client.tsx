"use client";

import { useState } from "react";
import { CheckCheck, CalendarClock, Receipt, Award, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Built server-side by page.tsx; `kind` doubles as the Preferences filter key. */
export interface NotificationItem {
  id: string;
  kind: "attendance" | "fees" | "results" | "events";
  title: string;
  description: string;
  time: string;
}

const KIND_STYLE: Record<NotificationItem["kind"], { icon: React.ReactNode; tone: string }> = {
  attendance: { icon: <TriangleAlert size={18} />, tone: "bg-error-container/50 text-error" },
  fees: { icon: <Receipt size={18} />, tone: "bg-secondary-container/20 text-secondary" },
  results: { icon: <Award size={18} />, tone: "bg-emerald-100 text-emerald-600" },
  events: { icon: <CalendarClock size={18} />, tone: "bg-primary/10 text-primary" },
};

export function NotificationsClient({ items: allItems }: { items: NotificationItem[] }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState({ attendance: true, fees: true, results: true, events: true });
  const items = allItems.filter((i) => prefs[i.kind]);
  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${KIND_STYLE[item.kind].tone}`}>{KIND_STYLE[item.kind].icon}</div>
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
