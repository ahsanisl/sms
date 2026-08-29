"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StudentForm, type StudentFormValues } from "@/components/students/student-form";
import { useStudents } from "@/lib/store/hooks";

export default function NewStudentPage() {
  const router = useRouter();
  const { addStudent } = useStudents();

  function handleSubmit(values: StudentFormValues) {
    addStudent(values);
    toast.success(`${values.name} was added to the roster.`);
    router.push("/students");
  }

  return (
    <div>
      <PageHeader title="Add Student" description="Enroll a new student and assign them to a class." />
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm p-lg max-w-4xl">
        <StudentForm onSubmit={handleSubmit} onCancel={() => router.push("/students")} />
      </div>
    </div>
  );
}
