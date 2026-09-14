"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TopicForm, type TopicFormValues } from "@/components/curriculum/topic-form";
import { createTopicAction, updateTopicAction, updateTopicStatusAction, deleteTopicAction, reorderTopicsAction } from "@/app/(app)/curriculum/actions";
import { formatDate } from "@/lib/format";

type TopicStatus = "not_started" | "in_progress" | "completed";

const STATUS_LABEL: Record<TopicStatus, string> = { not_started: "Not Started", in_progress: "In Progress", completed: "Completed" };
const STATUS_TONE: Record<TopicStatus, "neutral" | "warning" | "success"> = { not_started: "neutral", in_progress: "warning", completed: "success" };

interface TopicRow {
  id: string;
  title: string;
  description: string;
  plannedStartDate: string;
  plannedEndDate: string;
  status: TopicStatus;
  completedDate: string;
}

interface CurriculumClientProps {
  classOptions: { id: string; label: string }[];
  classId: string;
  subjectOptions: { id: string; name: string }[];
  subjectId: string;
  academicSessionId: string;
  sessionLabel: string;
  topics: TopicRow[];
  canManage: boolean;
  isTeacher: boolean;
}

export function CurriculumClient({
  classOptions,
  classId,
  subjectOptions,
  subjectId,
  academicSessionId,
  sessionLabel,
  topics,
  canManage,
  isTeacher,
}: CurriculumClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TopicRow | null>(null);
  const [deleting, setDeleting] = useState<TopicRow | null>(null);

  function navigate(nextClassId: string, nextSubjectId: string) {
    router.push(`/curriculum?classId=${nextClassId}&subjectId=${nextSubjectId}`);
  }

  async function handleAdd(values: TopicFormValues) {
    const result = await createTopicAction({ classId, subjectId, academicSessionId, ...values });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.title}" was added.`);
    setAddOpen(false);
    router.refresh();
  }

  async function handleEdit(values: TopicFormValues) {
    if (!editing) return;
    const result = await updateTopicAction(editing.id, { classId, subjectId, academicSessionId, ...values });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.title}" was updated.`);
    setEditing(null);
    router.refresh();
  }

  async function handleStatusChange(topic: TopicRow, status: TopicStatus) {
    const result = await updateTopicStatusAction(topic.id, status);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteTopicAction(deleting.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${deleting.title}" was removed.`);
    setDeleting(null);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= topics.length) return;
    const reordered = [...topics];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const result = await reorderTopicsAction(classId, reordered.map((t) => t.id));
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  const completedCount = topics.filter((t) => t.status === "completed").length;
  const progressPct = topics.length ? Math.round((completedCount / topics.length) * 100) : 0;
  const canEditStatus = canManage || isTeacher;

  return (
    <div>
      <PageHeader
        title="Curriculum"
        description="The syllabus plan for each class and subject — track what's taught and how far along coverage is."
        actions={
          canManage && (
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={!classId || !subjectId || !academicSessionId}>
              <Plus size={16} /> Add Topic
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="w-56">
          <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Class</label>
          <Select value={classId} onChange={(e) => navigate(e.target.value, "")} className="w-full">
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <label className="block text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Subject</label>
          <Select value={subjectId} onChange={(e) => navigate(classId, e.target.value)} className="w-full" disabled={subjectOptions.length === 0}>
            {subjectOptions.length === 0 && <option value="">No subjects for this class</option>}
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="text-label-sm text-on-surface-variant pb-2">{sessionLabel}</div>
      </div>

      {!academicSessionId && (
        <EmptyState icon="event_busy" title="No active academic session" description="Set an active session in Settings → Academic Sessions before planning a curriculum." />
      )}

      {academicSessionId && topics.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden max-w-md">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-label-sm text-on-surface-variant">{completedCount}/{topics.length} topics completed ({progressPct}%)</span>
        </div>
      )}

      {academicSessionId && (
        <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant/40 overflow-hidden">
          {topics.map((topic, index) => (
            <div key={topic.id} className="flex items-start gap-4 px-4 py-4 bg-surface-container-lowest">
              {canManage && (
                <div className="flex flex-col gap-1 pt-1">
                  <button type="button" className="text-on-surface-variant hover:text-secondary disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" className="text-on-surface-variant hover:text-secondary disabled:opacity-30" disabled={index === topics.length - 1} onClick={() => move(index, 1)}>
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body-md font-semibold text-on-surface">{topic.title}</p>
                  <StatusBadge label={STATUS_LABEL[topic.status]} tone={STATUS_TONE[topic.status]} />
                </div>
                {topic.description && <p className="text-body-md text-on-surface-variant mt-1">{topic.description}</p>}
                {(topic.plannedStartDate || topic.plannedEndDate) && (
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    Planned: {topic.plannedStartDate ? formatDate(topic.plannedStartDate) : "—"} – {topic.plannedEndDate ? formatDate(topic.plannedEndDate) : "—"}
                  </p>
                )}
                {topic.status === "completed" && topic.completedDate && (
                  <p className="text-label-sm text-emerald-600 mt-1">Completed {formatDate(topic.completedDate)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEditStatus && (
                  <Select value={topic.status} onChange={(e) => handleStatusChange(topic, e.target.value as TopicStatus)} className="w-40">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                )}
                {canManage && (
                  <>
                    <button className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-md transition-colors" onClick={() => setEditing(topic)}>
                      <Pencil size={16} />
                    </button>
                    <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors" onClick={() => setDeleting(topic)}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <div className="p-lg">
              <EmptyState icon="menu_book" title="No topics yet" description={canManage ? "Add the first topic for this class and subject." : "No syllabus has been added for this class and subject yet."} />
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Topic" className="max-w-[32rem]">
        <TopicForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit Topic" className="max-w-[32rem]">
        {editing && <TopicForm initialValues={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this topic?"
        description={deleting ? `"${deleting.title}" will be permanently removed from this class and subject's syllabus.` : undefined}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </div>
  );
}
