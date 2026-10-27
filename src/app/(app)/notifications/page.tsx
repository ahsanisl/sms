import { requireSession } from "@/lib/tenancy";
import { NotificationsClient } from "@/app/(app)/notifications/notifications-client";
import { buildNotificationItems } from "@/app/(app)/notifications/build-items";

/** Notifications are derived per request from the viewer's own scoped data — see build-items.ts. */
export default async function NotificationsPage() {
  const session = await requireSession();
  const items = session.schoolId ? await buildNotificationItems(session) : [];
  return <NotificationsClient items={items} />;
}
