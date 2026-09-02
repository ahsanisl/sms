"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { createStudentAction } from "@/app/(app)/students/new/actions";
import type { Campus, ClassSection } from "@/lib/types";

export function NewStudentClient({ campuses, classes }: { campuses: Campus[]; classes: ClassSection[] }) {
  const router = useRouter();

  async function handleSubmit(values: StudentFormValues) {
    const result = await createStudentAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} was added to the roster.`);
    router.push("/students");
  }

  return (
    <div>
      <PageHeader title="Add Student" description="Enroll a new student and assign them to a class." />
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm p-lg max-w-4xl">
        <StudentForm onSubmit={handleSubmit} onCancel={() => router.push("/students")} campuses={campuses} classes={classes} />
      </div>
    </div>
  );
}
