"use client";

import { useState } from "react";
import type { Campus, ClassSection, Student, StudentStatus } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCampuses, useClasses } from "@/lib/store/hooks";
import { classLabel as mockClassLabel } from "@/lib/mock/reference-data";

export type StudentFormValues = Omit<Student, "id">;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// A function, not a module-level constant — see teacher-form.tsx's
// emptyValues() for why: classes[0] must be read fresh on every mount, not
// frozen at module-import time (empty/wrong for a brand-new school whose
// first class hasn't synced yet).
function emptyValues(classes: { id: string; campusId: string }[]): StudentFormValues {
  return {
    name: "",
    rollNumber: "",
    admissionNo: "",
    classId: classes[0]?.id ?? "",
    campusId: classes[0]?.campusId ?? "",
    gender: "male",
    dob: "",
    bloodGroup: "O+",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    address: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };
}

interface StudentFormProps {
  initialValues?: Student;
  onSubmit: (values: StudentFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  /** Real-data callers pass their own campus/class lists; omitted, this falls back to the mock store (only the onboarding wizard still relies on that fallback). */
  campuses?: Campus[];
  classes?: ClassSection[];
}

export function StudentForm({ initialValues, onSubmit, onCancel, submitLabel = "Save Student", campuses: campusesProp, classes: classesProp }: StudentFormProps) {
  const { campuses: mockCampuses } = useCampuses();
  const { classes: mockClasses } = useClasses();
  const campuses = campusesProp ?? mockCampuses;
  const classes = classesProp ?? mockClasses;
  const classLabel = (c: ClassSection) => (classesProp ? `${c.grade}-${c.section}` : mockClassLabel(c));

  const [values, setValues] = useState<StudentFormValues>(initialValues ?? emptyValues(classes));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleClassChange(classId: string) {
    const cls = classes.find((c) => c.id === classId);
    setValues((prev) => ({ ...prev, classId, campusId: cls?.campusId ?? prev.campusId }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Student name is required.";
    if (!values.rollNumber.trim()) next.rollNumber = "Roll number is required.";
    if (!values.dob) next.dob = "Date of birth is required.";
    if (!values.parentName.trim()) next.parentName = "Parent/guardian name is required.";
    if (!values.parentPhone.trim()) next.parentPhone = "Parent phone number is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-title-lg font-semibold text-primary">Student Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Full Name" htmlFor="name" required error={errors.name}>
            <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Ahmed Khan" />
          </FormField>
          <FormField label="Roll Number" htmlFor="rollNumber" required error={errors.rollNumber}>
            <Input id="rollNumber" value={values.rollNumber} onChange={(e) => set("rollNumber", e.target.value)} placeholder="e.g., 5A-09" />
          </FormField>
          <FormField label="Gender" htmlFor="gender">
            <Select id="gender" value={values.gender} onChange={(e) => set("gender", e.target.value as Student["gender"])} className="w-full">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </FormField>
          <FormField label="Date of Birth" htmlFor="dob" required error={errors.dob}>
            <Input id="dob" type="date" value={values.dob} onChange={(e) => set("dob", e.target.value)} />
          </FormField>
          <FormField label="Blood Group" htmlFor="bloodGroup">
            <Select id="bloodGroup" value={values.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="w-full">
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="status">
            <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value as StudentStatus)} className="w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-title-lg font-semibold text-primary">Enrollment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Campus" htmlFor="campusId">
            <Select
              id="campusId"
              value={values.campusId}
              onChange={(e) => {
                set("campusId", e.target.value);
                const firstClass = classes.find((c) => c.campusId === e.target.value);
                if (firstClass) set("classId", firstClass.id);
              }}
              className="w-full"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Class" htmlFor="classId">
            <Select id="classId" value={values.classId} onChange={(e) => handleClassChange(e.target.value)} className="w-full">
              {classes.filter((c) => c.campusId === values.campusId).map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Admission Number" htmlFor="admissionNo">
            <Input id="admissionNo" value={values.admissionNo} onChange={(e) => set("admissionNo", e.target.value)} placeholder="e.g., EDU-2026-0451" />
          </FormField>
          <FormField label="Admission Date" htmlFor="admissionDate">
            <Input id="admissionDate" type="date" value={values.admissionDate} onChange={(e) => set("admissionDate", e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-title-lg font-semibold text-primary">Parent / Guardian</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Parent/Guardian Name" htmlFor="parentName" required error={errors.parentName}>
            <Input id="parentName" value={values.parentName} onChange={(e) => set("parentName", e.target.value)} placeholder="e.g., Mr. Tariq Khan" />
          </FormField>
          <FormField label="Phone Number" htmlFor="parentPhone" required error={errors.parentPhone}>
            <Input id="parentPhone" value={values.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} placeholder="+92 300 1234567" />
          </FormField>
          <FormField label="Email" htmlFor="parentEmail">
            <Input id="parentEmail" type="email" value={values.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} placeholder="parent@example.com" />
          </FormField>
          <FormField label="Address" htmlFor="address">
            <Input id="address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="House #, Area, City" />
          </FormField>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
