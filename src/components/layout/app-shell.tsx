import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-lg lg:p-xl">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
