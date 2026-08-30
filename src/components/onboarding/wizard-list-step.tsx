"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";

interface WizardListStepProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  onRemove?: (id: string) => void;
  addButtonLabel: string;
  modalTitle: string;
  /** Render the entity's existing Form component; call `close` from its onCancel/onSubmit to dismiss the modal. */
  renderForm: (close: () => void) => ReactNode;
  emptyHint: string;
}

/**
 * The shared shape behind every "add a few records" wizard step (Campus,
 * Subjects, Teachers, Classes, Students, Sessions, Fee Categories) — a
 * running list with a remove action, plus the entity's own existing Form
 * component in the same Modal pattern used everywhere else in the app.
 * Grade Scale and Timetable are different enough (bespoke bulk editors, not
 * one-record-at-a-time) that they reuse their full settings pages directly
 * instead of this component — see onboarding/page.tsx.
 */
export function WizardListStep<T>({
  items,
  getId,
  getLabel,
  getSubLabel,
  onRemove,
  addButtonLabel,
  modalTitle,
  renderForm,
  emptyHint,
}: WizardListStepProps<T>) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> {addButtonLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant border border-dashed border-outline-variant rounded-xl p-lg text-center">{emptyHint}</p>
      ) : (
        <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant/40 overflow-hidden">
          {items.map((item) => (
            <div key={getId(item)} className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest">
              <div>
                <p className="text-body-md text-on-surface font-medium">{getLabel(item)}</p>
                {getSubLabel && <p className="text-label-sm text-on-surface-variant">{getSubLabel(item)}</p>}
              </div>
              {onRemove && (
                <button
                  type="button"
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
                  onClick={() => onRemove(getId(item))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onOpenChange={setAddOpen} title={modalTitle} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {renderForm(() => setAddOpen(false))}
      </Modal>
    </div>
  );
}
