"use client";

import { useCallback, useMemo } from "react";
import { usePersistedString } from "@/lib/use-persisted-state";

/** Keep the stored list bounded — old ids for notifications that no longer exist just age out. */
const MAX_STORED_IDS = 500;

/**
 * Which derived notifications (see app/(app)/notifications/build-items.ts)
 * this user has read, remembered per browser and per account. Notifications
 * aren't stored server-side, so neither is their read state; the ids are
 * record-based (`exam-<id>`, `pay-<id>`, …) and stay stable across requests.
 * Shared by the Notification Center and the top bar's unread badge, which
 * update together.
 */
export function useReadNotifications(userId: string | undefined): [Set<string>, (ids: string[]) => void] {
  const [raw, setRaw] = usePersistedString(`eduflow:read-notifications:${userId ?? "anon"}`, "");
  const readIds = useMemo(() => new Set(raw.split(",").filter(Boolean)), [raw]);
  const markRead = useCallback(
    (ids: string[]) => {
      const next = [...new Set([...raw.split(",").filter(Boolean), ...ids])].slice(-MAX_STORED_IDS);
      setRaw(next.join(","));
    },
    [raw, setRaw],
  );
  return [readIds, markRead];
}
