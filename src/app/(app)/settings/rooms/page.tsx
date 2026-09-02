import * as roomService from "@/services/room.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { RoomManagementClient } from "@/app/(app)/settings/rooms/rooms-client";

export default async function RoomManagementPage() {
  const session = await requireSession();
  const [rooms, campuses] = await Promise.all([roomService.listRooms(session), campusService.listCampuses(session)]);

  return <RoomManagementClient rooms={rooms} campuses={campuses} />;
}
