import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { FeeStructureClient } from "@/app/(app)/fees/structure/structure-client";

export default async function FeeStructurePage() {
  const session = await requireSession();
  const [campuses, classes, feeCategories, structureItems] = await Promise.all([
    campusService.listCampuses(session),
    classService.listClasses(session),
    feeService.listCategories(session),
    feeService.listStructureItems(session),
  ]);

  return (
    <FeeStructureClient
      campuses={campuses.filter((c) => c.status === "active")}
      classes={classes}
      feeCategories={feeCategories}
      structureItems={structureItems}
      defaultCampusId={session.role === "campus_admin" ? (session.campusId ?? undefined) : undefined}
    />
  );
}
