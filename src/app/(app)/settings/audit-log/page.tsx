import * as auditService from "@/services/audit.service";
import { requireSession } from "@/lib/tenancy";
import { AuditLogClient } from "@/app/(app)/settings/audit-log/audit-log-client";

interface AuditLogSearchParams {
  page?: string;
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<AuditLogSearchParams> }) {
  const params = await searchParams;
  const session = await requireSession();

  const filters = {
    action: params.action || undefined,
    entity: params.entity || undefined,
    userId: params.userId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };
  const pageNumber = Math.max(1, Number(params.page) || 1);

  const [result, filterOptions, retentionDays] = await Promise.all([
    auditService.listAuditLogs(session, filters, pageNumber),
    auditService.listFilterOptions(session),
    auditService.getRetentionDays(session),
  ]);

  return (
    <AuditLogClient
      rows={result.rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        metadata: r.metadata,
        userName: r.userName,
        userRole: r.userRole,
      }))}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{ action: params.action ?? "", entity: params.entity ?? "", userId: params.userId ?? "", dateFrom: params.dateFrom ?? "", dateTo: params.dateTo ?? "" }}
      filterOptions={filterOptions}
      retentionDays={retentionDays}
    />
  );
}
