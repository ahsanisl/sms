"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, GraduationCap, Pencil, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/shared/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/teacher-form";
import { useTeachers, useStudents, useTimetableConfig } from "@/lib/store/hooks";
import { SUBJECTS, classLabel } from "@/lib/mock/reference-data";
import { timetableForTeacher } from "@/lib/mock/timetable";
import { formatDate } from "@/lib/format";

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { teachers, updateTeacher } = useTeachers();
  const { students } = useStudents();
  const { workingDays } = useTimetableConfig();
  const [editOpen, setEditOpen] = useState(false);

  const teacher = teachers.find((t) => t.id === id);

  if (!teacher) {
    return (
      <EmptyState
        icon="person_off"
        title="Teacher not found"
        description="This teacher may have been removed. Go back to the faculty directory."
        actionLabel="Back to Teachers"
        onAction={() => router.push("/teachers")}
      />
    );
  }

  function handleEditSubmit(values: TeacherFormValues) {
    updateTeacher({ ...values, id: teacher!.id, classIds: teacher!.classIds });
    toast.success("Teacher profile updated.");
    setEditOpen(false);
  }

  const weeklySlots = timetableForTeacher(teacher.id);

  return (
    <div>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row md:flex-wrap items-start md:items-center justify-between gap-6 mb-6 shadow-sm">
        <div className="flex items-center gap-6">
          <Avatar name={teacher.name} size="lg" className="h-24 w-24 text-2xl" />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-headline-lg font-semibold text-on-surface">{teacher.name}</h2>
              <span className="bg-surface-container text-primary px-2 py-1 rounded-full text-label-sm border border-secondary-fixed">
                {teacher.employeeId}
              </span>
              <StatusBadge label={teacher.status === "active" ? "Active" : "Inactive"} tone={teacher.status === "active" ? "info" : "neutral"} />
            </div>
            <p className="text-on-surface-variant text-body-md">
              {teacher.subjectIds.map((sid) => SUBJECTS.find((s) => s.id === sid)?.name).join(", ")}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil size={18} /> Edit Teacher
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <h3 className="text-title-lg font-semibold text-on-surface mb-4 border-b border-outline-variant pb-2">Contact Information</h3>
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-body-md text-on-surface"><Phone size={16} className="text-secondary" /> {teacher.phone}</p>
                <p className="flex items-center gap-2 text-body-md text-on-surface"><Mail size={16} className="text-secondary" /> {teacher.email}</p>
                <p className="flex items-center gap-2 text-body-md text-on-surface"><GraduationCap size={16} className="text-secondary" /> {teacher.qualification}</p>
                <p className="flex items-center gap-2 text-body-md text-on-surface"><Calendar size={16} className="text-secondary" /> Joined {formatDate(teacher.joinDate)}</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <h3 className="text-title-lg font-semibold text-on-surface mb-4 border-b border-outline-variant pb-2">At a Glance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Classes Assigned</p>
                  <p className="text-headline-sm font-semibold text-primary">{teacher.classIds.length}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Total Students</p>
                  <p className="text-headline-sm font-semibold text-primary">
                    {students.filter((s) => teacher.classIds.includes(s.classId)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="classes">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm divide-y divide-outline-variant/20">
            {teacher.classIds.map((classId) => (
              <div key={classId} className="flex items-center justify-between px-lg py-4">
                <span className="text-body-md font-medium text-on-surface">{classLabel(classId)}</span>
                <span className="text-label-sm text-on-surface-variant">{students.filter((s) => s.classId === classId).length} students</span>
              </div>
            ))}
            {teacher.classIds.length === 0 && <p className="px-lg py-6 text-body-md text-on-surface-variant">No classes assigned.</p>}
          </div>
        </TabsContent>

        <TabsContent value="timetable">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {workingDays.map((day) => (
              <div key={day} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
                <p className="text-label-md font-semibold text-primary mb-3">{day}</p>
                <div className="space-y-2">
                  {weeklySlots
                    .filter((s) => s.day === day)
                    .sort((a, b) => a.period - b.period)
                    .map((s) => (
                      <div key={s.id} className="text-label-sm text-on-surface-variant border-l-2 border-secondary pl-2">
                        <p className="text-on-surface font-medium">{SUBJECTS.find((sub) => sub.id === s.subjectId)?.name}</p>
                        <p>{classLabel(s.classId)} · {s.startTime}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Edit Teacher" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <TeacherForm initialValues={teacher} submitLabel="Save Changes" onSubmit={handleEditSubmit} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
