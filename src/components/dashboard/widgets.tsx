"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-config";

const noopSubscribe = () => () => {};

function partOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-of-day greeting computed in the viewer's own timezone. The server (and
 * hydration pass) renders a neutral "Welcome back" since it can't know the
 * viewer's local time.
 */
export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(noopSubscribe, partOfDay, () => "Welcome back");
  return (
    <>
      {greeting}, {name.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+/i, "").split(" ")[0]}
    </>
  );
}

export function DashboardHeader({
  name,
  subtitle,
  chips,
  actions,
}: {
  name: string;
  subtitle: React.ReactNode;
  chips?: { icon: string; label: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:mb-8 lg:flex-row lg:items-end">
      <div className="min-w-0">
        <h1 className="text-headline-md font-semibold tracking-tight text-primary md:text-headline-lg">
          <Greeting name={name} />
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
        {chips && chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/70 bg-surface-container-lowest px-3 py-1 text-label-md text-on-surface-variant">
                <Icon name={chip.icon} className="h-3.5 w-3.5" aria-hidden />
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type TaskTone = "error" | "warning" | "info";

export interface DashboardTask {
  id: string;
  icon: string;
  label: string;
  count: number;
  description?: string;
  href?: string;
  tone: TaskTone;
}

const TASK_TONE: Record<TaskTone, string> = {
  error: "bg-error-container/70 text-error",
  warning: "bg-warning-container text-warning",
  info: "bg-secondary-fixed text-secondary",
};

/** "Needs your attention" — real pending work counts, each linking to the screen where it gets done. Tasks with a zero count are hidden. */
export function TaskList({ tasks, className }: { tasks: DashboardTask[]; className?: string }) {
  const open = tasks.filter((t) => t.count > 0);
  return (
    <Card className={className}>
      <CardHeader
        title="Needs your attention"
        description={open.length ? `${open.length} item${open.length === 1 ? "" : "s"} waiting on you` : "Pending work across your scope"}
      />
      <div className="p-sm pt-md">
        {open.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-success-container/50 px-4 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-container text-success">
              <Icon name="task_alt" className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-body-md font-semibold text-on-success-container">You&apos;re all caught up</p>
              <p className="text-label-md text-on-surface-variant">Nothing is pending right now.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {open.map((task) => {
              const content = (
                <>
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TASK_TONE[task.tone])}>
                    <Icon name={task.icon} className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-md font-medium text-on-surface">{task.label}</span>
                    {task.description && <span className="block truncate text-label-md text-on-surface-variant">{task.description}</span>}
                  </span>
                  <span className={cn("min-w-[2rem] rounded-full px-2 py-0.5 text-center text-label-md font-bold tabular-nums", TASK_TONE[task.tone])}>{task.count}</span>
                  {task.href && <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />}
                </>
              );
              return (
                <li key={task.id}>
                  {task.href ? (
                    <Link href={task.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-low">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

export interface DashboardEvent {
  id: string;
  /** ISO date (YYYY-MM-DD) the event starts. */
  date: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
}

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Upcoming dated items (exams, staff leave, due homework) as a compact agenda. */
export function EventList({
  title = "Upcoming",
  description,
  events,
  emptyText,
  footer,
  className,
}: {
  title?: string;
  description?: string;
  events: DashboardEvent[];
  emptyText: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} />
      <div className="flex-1 p-sm pt-md">
        {events.length === 0 ? (
          <p className="px-3 py-6 text-center text-body-md text-on-surface-variant">{emptyText}</p>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => {
              const [, m, d] = event.date.split("-");
              const content = (
                <>
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-outline-variant/70 bg-surface-container-low leading-none">
                    <span className="text-[10px] font-semibold uppercase text-secondary">{MONTH[Number(m) - 1] ?? ""}</span>
                    <span className="mt-0.5 text-body-lg font-bold text-primary">{Number(d) || ""}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md font-medium text-on-surface">{event.title}</span>
                    {event.subtitle && <span className="block truncate text-label-md text-on-surface-variant">{event.subtitle}</span>}
                  </span>
                  {event.badge && <span className="shrink-0 rounded-full bg-secondary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-secondary-fixed-variant">{event.badge}</span>}
                </>
              );
              return (
                <li key={event.id}>
                  {event.href ? (
                    <Link href={event.href} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-container-low">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {footer && <div className="border-t border-outline-variant/50 px-lg py-3">{footer}</div>}
    </Card>
  );
}

/** Grid of shortcut tiles — callers pass only the actions the role is permitted to use. */
export function QuickActions({ actions, className, columns = "grid-cols-2 sm:grid-cols-4" }: { actions: NavItem[]; className?: string; columns?: string }) {
  if (actions.length === 0) return null;
  return (
    <Card className={className}>
      <CardHeader title="Quick actions" />
      <div className={cn("grid gap-3 p-lg pt-md", columns)}>
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-start gap-3 rounded-xl border border-outline-variant/70 p-4 transition-colors hover:border-secondary/50 hover:bg-secondary-fixed/30"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-fixed text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
              <Icon name={action.icon} className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-body-md font-medium text-on-surface">{action.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Thin horizontal meter used for attendance / collection rates. */
export function ProgressBar({ value, tone = "default", label }: { value: number; tone?: "default" | "success" | "warning" | "error"; label: string }) {
  const fill = { default: "bg-secondary", success: "bg-success", warning: "bg-warning", error: "bg-error" }[tone];
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
      <div className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", fill)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function rateTone(rate: number): "success" | "warning" | "error" {
  return rate >= 90 ? "success" : rate >= 75 ? "warning" : "error";
}
