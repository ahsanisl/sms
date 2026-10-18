import { AuthGuard } from "@/components/layout/auth-guard";
import { AppShell, type TopbarCampusContext } from "@/components/layout/app-shell";
import * as campusService from "@/services/campus.service";
import * as academicSessionService from "@/services/academic-session.service";
import { getViewCampusId } from "@/services/scope";
import { requireSession, type AuthSession } from "@/lib/tenancy";
import type { Role } from "@/lib/types";

/** Roles that see the top bar's campus label/switcher (campus_admin sees a fixed label; the rest can switch). */
const CAMPUS_LABEL_ROLES: Role[] = ["school_owner", "school_admin", "campus_admin", "accountant"];

async function loadCampusContext(session: AuthSession): Promise<TopbarCampusContext | null> {
  if (!CAMPUS_LABEL_ROLES.includes(session.role)) return null;
  const [campuses, viewCampusId, sessions] = await Promise.all([
    campusService.listCampuses(session),
    getViewCampusId(session),
    academicSessionService.listSessions(session),
  ]);
  return {
    campuses: campuses.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name })),
    viewCampusId,
    sessionLabel: sessions.find((s) => s.isActive)?.label ?? null,
  };
}

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects signed-out requests; AuthGuard covers the
  // client side. A missing session here just means no campus context.
  const session = await requireSession().catch(() => null);
  const campusContext = session ? await loadCampusContext(session) : null;

  return (
    <AuthGuard>
      <AppShell campusContext={campusContext}>{children}</AppShell>
    </AuthGuard>
  );
}
