import "server-only";
import * as roomRepo from "@/repositories/rooms.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { RoomInputSchema } from "@/lib/validation/room";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

// Room Management has no dedicated permission module of its own — it falls under
// the generic "settings" module (see lib/permissions.ts's MODULE_ROUTES catch-all
// for any /settings/* path not covered by a more specific module).

export async function listRooms(session: AuthSession) {
  const campusIds = await scopedCampusIds(session);
  return roomRepo.listRooms(campusIds);
}

export async function createRoom(session: AuthSession, input: unknown) {
  await requirePermission(session, "settings");
  const data = RoomInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, ...rest } = data;
  const room = await roomRepo.createRoom(campusId, { ...rest, status: "active" });
  await logAudit(session, "room.created", "Room", room.id);
  return room;
}

export async function updateRoom(session: AuthSession, roomId: string, input: unknown) {
  await requirePermission(session, "settings");
  const data = RoomInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const campusIds = await scopedCampusIds(session);
  const updated = await roomRepo.updateRoom(campusIds, roomId, data);
  if (!updated) throw new NotFoundError("Room");
  await logAudit(session, "room.updated", "Room", roomId);
  return updated;
}

export async function archiveRoom(session: AuthSession, roomId: string) {
  await requirePermission(session, "settings");
  const campusIds = await scopedCampusIds(session);
  const archived = await roomRepo.archiveRoom(campusIds, roomId);
  if (!archived) throw new NotFoundError("Room");
  await logAudit(session, "room.archived", "Room", roomId);
  return archived;
}
