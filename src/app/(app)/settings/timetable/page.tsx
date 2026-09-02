import * as timetableService from "@/services/timetable.service";
import { requireSession } from "@/lib/tenancy";
import { TimetableSettingsClient } from "@/app/(app)/settings/timetable/timetable-settings-client";
import type { TimetableDay } from "@/lib/types";

export default async function TimetableSettingsPage() {
  const session = await requireSession();
  const config = await timetableService.getConfig(session);

  return (
    <TimetableSettingsClient
      workingDays={config.workingDays as TimetableDay[]}
      periods={config.periods.map((p) => ({ period: p.period, startTime: p.startTime, endTime: p.endTime }))}
      breakAfterPeriod={config.breakAfterPeriod}
    />
  );
}
