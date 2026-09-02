import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { FeeCategoriesClient } from "@/app/(app)/settings/fee-categories/fee-categories-client";

export default async function FeeCategoriesPage() {
  const session = await requireSession();
  const [feeCategories, structureItems] = await Promise.all([feeService.listCategories(session), feeService.listStructureItems(session)]);

  const usageCounts = new Map<string, number>();
  for (const item of structureItems) {
    usageCounts.set(item.name, (usageCounts.get(item.name) ?? 0) + 1);
  }

  return <FeeCategoriesClient feeCategories={feeCategories} usageCounts={usageCounts} />;
}
