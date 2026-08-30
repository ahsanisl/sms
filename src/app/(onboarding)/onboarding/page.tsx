"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardListStep } from "@/components/onboarding/wizard-list-step";
import { CampusForm } from "@/components/settings/campus-form";
import { SubjectForm } from "@/components/settings/subject-form";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { ClassForm } from "@/components/classes/class-form";
import { StudentForm } from "@/components/students/student-form";
import { SessionForm } from "@/components/settings/session-form";
import { FeeCategoryForm } from "@/components/settings/fee-category-form";
import GradeScalePage from "@/app/(app)/settings/grade-scale/page";
import TimetableSettingsPage from "@/app/(app)/settings/timetable/page";
import {
  useCampuses,
  useClasses,
  useFeeCategories,
  useGradeScale,
  useSchoolProfile,
  useSessions,
  useStudents,
  useSubjects,
  useTeachers,
  useTimetableConfig,
} from "@/lib/store/hooks";
import { campusName, classLabel } from "@/lib/mock/reference-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type StepKey = "campus" | "subjects" | "teachers" | "classes" | "students" | "session" | "gradeScale" | "timetable" | "feeCategories" | "finish";

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { schoolProfile, completeOnboarding } = useSchoolProfile();

  const { campuses, addCampus, archiveCampus } = useCampuses();
  const { subjects, addSubject, archiveSubject } = useSubjects();
  const { teachers, addTeacher, deleteTeacher } = useTeachers();
  const { classes, addClass, archiveClass } = useClasses();
  const { students, addStudent, deleteStudent } = useStudents();
  const { sessions, addSession } = useSessions();
  const { gradeScale } = useGradeScale();
  const { workingDays } = useTimetableConfig();
  const { feeCategories, addFeeCategory, archiveFeeCategory } = useFeeCategories();

  const activeCampuses = campuses.filter((c) => c.status === "active");
  const activeSubjects = subjects.filter((s) => s.status === "active");
  const activeClasses = classes.filter((c) => c.status === "active");
  const activeFeeCategories = feeCategories.filter((c) => c.status === "active");

  const STEPS: { key: Exclude<StepKey, "finish">; label: string; required: boolean; done: boolean }[] = [
    { key: "campus", label: "Campus", required: true, done: activeCampuses.length > 0 },
    { key: "subjects", label: "Subjects", required: true, done: activeSubjects.length > 0 },
    { key: "teachers", label: "Teachers", required: true, done: teachers.length > 0 },
    { key: "classes", label: "Classes", required: true, done: activeClasses.length > 0 },
    { key: "students", label: "Students", required: true, done: students.length > 0 },
    { key: "session", label: "Academic Session", required: true, done: sessions.length > 0 },
    { key: "gradeScale", label: "Grade Scale", required: false, done: gradeScale.length > 0 },
    { key: "timetable", label: "Timetable", required: false, done: workingDays.length > 0 },
    { key: "feeCategories", label: "Fee Categories", required: false, done: activeFeeCategories.length > 0 },
  ];

  const [currentKey, setCurrentKey] = useState<StepKey>("campus");
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentKey);
  const isFinish = currentKey === "finish";
  const requiredRemaining = STEPS.filter((s) => s.required && !s.done);
  const canFinish = requiredRemaining.length === 0;

  function goTo(key: StepKey) {
    setCurrentKey(key);
  }

  function goNext() {
    if (currentStepIndex === -1 || currentStepIndex === STEPS.length - 1) {
      setCurrentKey("finish");
      return;
    }
    setCurrentKey(STEPS[currentStepIndex + 1].key);
  }

  function goBack() {
    if (isFinish) {
      setCurrentKey(STEPS[STEPS.length - 1].key);
      return;
    }
    if (currentStepIndex > 0) setCurrentKey(STEPS[currentStepIndex - 1].key);
  }

  function handleFinish() {
    if (!canFinish) {
      toast.error(`Finish these first: ${requiredRemaining.map((s) => s.label).join(", ")}.`);
      return;
    }
    completeOnboarding();
    toast.success(`${schoolProfile.name} is ready to go!`);
    router.push("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto px-lg py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Welcome to EduFlow</p>
          <h1 className="text-headline-md font-semibold text-on-surface">Let&apos;s set up {schoolProfile.name}</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center flex-wrap gap-y-3 mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <button type="button" onClick={() => goTo(step.key)} className="flex flex-col items-center gap-1.5 group">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-label-md font-semibold shrink-0 transition-colors",
                  step.done
                    ? "bg-secondary text-white"
                    : currentKey === step.key
                      ? "bg-secondary text-white ring-4 ring-secondary/20"
                      : "bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high",
                )}
              >
                {step.done ? <Check size={16} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-label-sm whitespace-nowrap",
                  currentKey === step.key ? "text-on-surface font-semibold" : "text-on-surface-variant",
                )}
              >
                {step.label}
                {!step.required && <span className="text-on-surface-variant/60"> (optional)</span>}
              </span>
            </button>
            {i < STEPS.length - 1 && <div className="h-0.5 w-6 md:w-10 mx-1 bg-outline-variant shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {!isFinish ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm mb-6">
          {currentKey === "campus" && (
            <StepShell title="Add at least one Campus" description="Every class, teacher, and student belongs to a campus — start here.">
              <WizardListStep
                items={activeCampuses}
                getId={(c) => c.id}
                getLabel={(c) => c.name}
                getSubLabel={(c) => c.city}
                onRemove={archiveCampus}
                addButtonLabel="Add Campus"
                modalTitle="Add Campus"
                emptyHint="No campuses yet."
                renderForm={(close) => (
                  <CampusForm
                    onSubmit={(values) => {
                      addCampus({ ...values, status: "active" });
                      toast.success(`${values.name} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "subjects" && (
            <StepShell title="Add the subjects taught here" description="Classes and teachers are assigned a subject, so at least one needs to exist first.">
              <WizardListStep
                items={activeSubjects}
                getId={(s) => s.id}
                getLabel={(s) => s.name}
                getSubLabel={(s) => s.code}
                onRemove={archiveSubject}
                addButtonLabel="Add Subject"
                modalTitle="Add Subject"
                emptyHint="No subjects yet."
                renderForm={(close) => (
                  <SubjectForm
                    onSubmit={(values) => {
                      addSubject({ ...values, status: "active" });
                      toast.success(`${values.name} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "teachers" && (
            <StepShell title="Add your teaching staff" description="Classes need a class teacher already on record, so add teachers before building classes.">
              <WizardListStep
                items={teachers}
                getId={(t) => t.id}
                getLabel={(t) => t.name}
                getSubLabel={(t) => campusName(t.campusId)}
                onRemove={deleteTeacher}
                addButtonLabel="Add Teacher"
                modalTitle="Add Teacher"
                emptyHint="No teachers yet."
                renderForm={(close) => (
                  <TeacherForm
                    onSubmit={(values) => {
                      addTeacher({ ...values, classIds: [] });
                      toast.success(`${values.name} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "classes" && (
            <StepShell title="Build your classes" description="Each class needs a campus, a class teacher, and subjects — all set up in the previous steps.">
              <WizardListStep
                items={activeClasses}
                getId={(c) => c.id}
                getLabel={(c) => classLabel(c)}
                getSubLabel={(c) => campusName(c.campusId)}
                onRemove={archiveClass}
                addButtonLabel="Add Class"
                modalTitle="Add Class"
                emptyHint="No classes yet."
                renderForm={(close) => (
                  <ClassForm
                    onSubmit={(values) => {
                      addClass(values);
                      toast.success(`${values.grade}-${values.section} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "students" && (
            <StepShell title="Add your first students" description="You can always add the rest of the roster gradually after setup.">
              <WizardListStep
                items={students}
                getId={(s) => s.id}
                getLabel={(s) => s.name}
                getSubLabel={(s) => classLabel(s.classId)}
                onRemove={deleteStudent}
                addButtonLabel="Add Student"
                modalTitle="Add Student"
                emptyHint="No students yet."
                renderForm={(close) => (
                  <StudentForm
                    onSubmit={(values) => {
                      addStudent(values);
                      toast.success(`${values.name} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "session" && (
            <StepShell title="Set your academic session" description="Defines the current school year and its terms.">
              <WizardListStep
                items={sessions}
                getId={(s) => s.id}
                getLabel={(s) => s.label}
                getSubLabel={(s) => `${formatDate(s.startDate)} – ${formatDate(s.endDate)}${s.isActive ? " · Active" : ""}`}
                addButtonLabel="Create Session"
                modalTitle="Create Academic Session"
                emptyHint="No academic session yet."
                renderForm={(close) => (
                  <SessionForm
                    onSubmit={(values) => {
                      addSession({ ...values, isActive: sessions.length === 0 });
                      toast.success(`${values.label} was created.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}

          {currentKey === "gradeScale" && (
            <StepShell title="Define the grade scale" description="Optional — without it, every exam mark shows as “F”. You can always come back to this in Settings." optional>
              <GradeScalePage />
            </StepShell>
          )}

          {currentKey === "timetable" && (
            <StepShell title="Configure the timetable" description="Optional — working days and periods used by the Timetable Builder. You can always come back to this in Settings." optional>
              <TimetableSettingsPage />
            </StepShell>
          )}

          {currentKey === "feeCategories" && (
            <StepShell title="Set up fee categories" description="Optional — the canonical list Fee Structure picks item names from." optional>
              <WizardListStep
                items={activeFeeCategories}
                getId={(c) => c.id}
                getLabel={(c) => c.name}
                onRemove={archiveFeeCategory}
                addButtonLabel="Add Category"
                modalTitle="Add Fee Category"
                emptyHint="No fee categories yet."
                renderForm={(close) => (
                  <FeeCategoryForm
                    onSubmit={(values) => {
                      addFeeCategory({ ...values, status: "active" });
                      toast.success(`${values.name} was added.`);
                      close();
                    }}
                    onCancel={close}
                  />
                )}
              />
            </StepShell>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm mb-6 space-y-4">
          <h2 className="text-title-lg font-semibold text-on-surface">Review</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STEPS.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-body-md">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", step.done ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant")}>
                  {step.done && <Check size={12} />}
                </div>
                <span className={step.done ? "text-on-surface" : "text-on-surface-variant"}>
                  {step.label}
                  {!step.required && !step.done && " — skipped"}
                </span>
              </div>
            ))}
          </div>
          {!canFinish && (
            <p className="text-label-sm text-error">Finish these required steps first: {requiredRemaining.map((s) => s.label).join(", ")}.</p>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goBack} disabled={currentStepIndex === 0 && !isFinish}>
          Back
        </Button>
        {isFinish ? (
          <Button onClick={handleFinish} disabled={!canFinish}>
            Go to Dashboard
          </Button>
        ) : (
          <Button onClick={goNext}>
            {currentStepIndex === STEPS.length - 1 ? "Review & Finish" : "Next"} <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function StepShell({
  title,
  description,
  optional,
  children,
}: {
  title: string;
  description: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-title-lg font-semibold text-on-surface">
          {title}
          {optional && <span className="text-label-sm font-normal text-on-surface-variant"> (optional)</span>}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
