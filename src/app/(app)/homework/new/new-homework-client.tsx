"use client";

import { useState } from "react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { HomeworkForm } from "@/components/homework/homework-form";
import { createHomeworkAction } from "@/app/(app)/homework/actions";

export function NewHomeworkClient({
  classes,
  subjects,
  teachers,
  isTeacher,
}: {
  classes: { id: string; label: string; subjectIds: string[]; campusId: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string; campusId: string }[];
  isTeacher: boolean;
}) {
  const router = useLoadingRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const result = await createHomeworkAction(formData);
    setSubmitting(false);
    if (!result.success || !result.id) {
      toast.error(result.error);
      return;
    }
    toast.success("Homework posted.");
    router.push(`/homework/${result.id}`);
  }

  return (
    <div>
      <PageHeader backHref="/homework" backLabel="Homework" title="New Homework" description="Assign homework to a class and subject." />
      <div className="max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <HomeworkForm
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          isTeacher={isTeacher}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/homework")}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
