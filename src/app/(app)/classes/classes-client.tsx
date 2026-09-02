"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ClassForm, type ClassFormValues } from "@/components/classes/class-form";
import { createClassAction } from "@/app/(app)/classes/actions";
import { GRADE_ORDER, wingForGrade } from "@/lib/mock/reference-data";
import { cn } from "@/lib/utils";
import type { Campus, Teacher } from "@/lib/types";

const WINGS = ["All Classes", "Primary Wing", "Middle Wing", "Senior Wing"] as const;

interface ClassWithNames {
  id: string;
  grade: string;
  section: string;
  campusId: string;
  campusName: string;
  classTeacherId: string;
  classTeacherName: string;
  subjectIds: string[];
  studentCount: number;
  status: string;
}

export function ClassesClient({
  classes,
  totalStudents,
  canManageClasses,
  campuses,
  teachers,
}: {
  classes: ClassWithNames[];
  totalStudents: number;
  canManageClasses: boolean;
  campuses: Campus[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [wing, setWing] = useState<(typeof WINGS)[number]>("All Classes");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = wing === "All Classes" ? classes : classes.filter((c) => wingForGrade(c.grade) === wing);
  const grades = GRADE_ORDER.filter((g) => filtered.some((c) => c.grade === g));

  async function handleAdd(values: ClassFormValues) {
    const result = await createClassAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.grade}-${values.section} was created.`);
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Classes & Sections"
        description="View grade-wise sections, enrollment and class teachers."
        actions={
          canManageClasses && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add Class
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard icon="class" label="Total Grades" value={grades.length} />
        <SummaryCard icon="category" label="Total Sections" value={filtered.length} />
        <SummaryCard icon="group" label="Total Students Enrolled" value={totalStudents} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-6">
        {WINGS.map((w) => (
          <button
            key={w}
            onClick={() => setWing(w)}
            className={cn(
              "px-4 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors",
              wing === w
                ? "bg-primary-container text-on-primary-container"
                : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
            )}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {grades.map((grade) => {
          const sections = filtered.filter((c) => c.grade === grade);
          const gradeStudents = sections.reduce((sum, c) => sum + c.studentCount, 0);
          return (
            <div key={grade} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-headline-md font-semibold text-primary">{grade}</h3>
                    <p className="text-body-md text-on-surface-variant">{wingForGrade(grade)}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-label-sm flex items-center gap-1">
                    <Check size={14} /> Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 my-6">
                  <div className="bg-surface-bright rounded-lg p-3 border border-outline-variant/50">
                    <p className="text-label-sm text-on-surface-variant">Sections</p>
                    <p className="text-title-lg font-semibold text-primary">{sections.length}</p>
                  </div>
                  <div className="bg-surface-bright rounded-lg p-3 border border-outline-variant/50">
                    <p className="text-label-sm text-on-surface-variant">Students</p>
                    <p className="text-title-lg font-semibold text-primary">{gradeStudents}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Sections Overview</p>
                  {sections.map((cls) => (
                    <Link
                      key={cls.id}
                      href={`/classes/${cls.id}`}
                      className="flex items-center justify-between text-body-md py-1.5 border-b border-outline-variant/30 last:border-0 hover:text-secondary transition-colors"
                    >
                      <span className="text-on-surface">{cls.section} <span className="text-on-surface-variant text-xs">({cls.campusName})</span></span>
                      <span className="text-on-surface-variant text-sm">
                        {cls.studentCount} Students • {cls.classTeacherName}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Class" className="max-w-[36rem]">
        <ClassForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} campuses={campuses} teachers={teachers} />
      </Modal>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className="text-headline-lg font-semibold text-primary mt-1">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
