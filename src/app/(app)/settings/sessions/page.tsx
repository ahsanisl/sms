"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { SessionForm, type SessionFormValues } from "@/components/settings/session-form";
import { useSessions } from "@/lib/store/hooks";
import type { AcademicSession } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AcademicSessionsPage() {
  const { sessions, addSession, updateSession, setActiveSession } = useSessions();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicSession | null>(null);

  function handleAdd(values: SessionFormValues) {
    addSession({ ...values, isActive: false });
    toast.success(`${values.label} was created.`);
    setAddOpen(false);
  }

  function handleEdit(values: SessionFormValues) {
    if (!editing) return;
    updateSession({ ...editing, ...values });
    toast.success(`${values.label} was updated.`);
    setEditing(null);
  }

  function handleSetActive(session: AcademicSession) {
    setActiveSession(session.id);
    toast.success(`${session.label} is now the active academic session.`);
  }

  return (
    <div>
      <PageHeader
        title="Academic Sessions"
        description="Manage academic years and terms. Only one session is active at a time."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Create Session
          </Button>
        }
      />

      <div className="space-y-4">
        {[...sessions].reverse().map((session) => (
          <div key={session.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-title-lg font-semibold text-on-surface">{session.label}</h3>
                  {session.isActive && <StatusBadge label="Active" tone="success" />}
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  {formatDate(session.startDate)} – {formatDate(session.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(session)}>
                  <Pencil size={14} /> Edit
                </Button>
                {!session.isActive && (
                  <Button size="sm" onClick={() => handleSetActive(session)}>
                    <CheckCircle2 size={14} /> Set Active
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {session.terms.map((term) => (
                <div key={term.name} className="bg-surface-bright border border-outline-variant/50 rounded-lg p-3">
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">{term.name}</p>
                  <p className="text-body-md text-on-surface">
                    {formatDate(term.startDate)} – {formatDate(term.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Create Academic Session" className="max-w-[32rem] max-h-[85vh] overflow-y-auto">
        <SessionForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Academic Session" className="max-w-[32rem] max-h-[85vh] overflow-y-auto">
        {editing && <SessionForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
