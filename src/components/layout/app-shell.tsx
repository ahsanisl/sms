import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

/** Loaded server-side by the (app) layout — real campuses plus the switcher's current campus (see services/scope.ts's getViewCampusId). */
export interface TopbarCampusContext {
  campuses: { id: string; name: string }[];
  viewCampusId: string | null;
  sessionLabel: string | null;
}

export function AppShell({ children, campusContext }: { children: React.ReactNode; campusContext: TopbarCampusContext | null }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        <Topbar campusContext={campusContext} />
        <main className="flex-1 overflow-y-auto p-lg lg:p-xl">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
