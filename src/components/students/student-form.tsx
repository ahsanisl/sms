"use client";

import { useState } from "react";
import type { Campus, ClassSection, Student, StudentStatus } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EMPTY_STUDENT_EXTRA_FIELDS, RELATION_SUGGESTIONS } from "@/lib/constants";

export type StudentFormValues = Omit<Student, "id">;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATION_LIST_ID = "student-form-relations";

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
    ...EMPTY_STUDENT_EXTRA_FIELDS,
  };
}

interface StudentFormProps {
  initialValues?: Student;
  onSubmit: (values: StudentFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  campuses: Campus[];
  classes: ClassSection[];
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-title-lg font-semibold text-primary">{title}</h3>
        {description && <p className="mt-0.5 text-body-md text-on-surface-variant">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function StudentForm({ initialValues, onSubmit, onCancel, submitLabel = "Save Student", campuses, classes }: StudentFormProps) {
  const classLabel = (c: ClassSection) => `${c.grade}-${c.section}`;

  // Records saved before the extra fields existed may lack them — fill blanks so every input stays controlled.
  const [values, setValues] = useState<StudentFormValues>(initialValues ? { ...EMPTY_STUDENT_EXTRA_FIELDS, ...initialValues } : emptyValues(classes));
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
    if (values.bFormNumber.trim() && !/^\d{13}$/.test(values.bFormNumber.replace(/[\s-]/g, ""))) next.bFormNumber = "Must have 13 digits, e.g. 35202-1234567-1.";
    if (values.secondaryGuardianEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.secondaryGuardianEmail.trim())) next.secondaryGuardianEmail = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) {
      // Long form — bring the first problem into view.
      document.getElementById(Object.keys(next)[0])?.focus();
    }
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  }

  const field = (key: keyof StudentFormValues) => ({
    id: key,
    value: (values[key] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
    "aria-invalid": errors[key] ? true : undefined,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <datalist id={RELATION_LIST_ID}>
        {RELATION_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <Section title="Student Information">
        <FormField label="Full Name" htmlFor="name" required error={errors.name}>
          <Input {...field("name")} placeholder="e.g., Ahmed Khan" />
        </FormField>
        <FormField label="Roll Number" htmlFor="rollNumber" required error={errors.rollNumber}>
          <Input {...field("rollNumber")} placeholder="e.g., 5A-09" />
        </FormField>
        <FormField label="Gender" htmlFor="gender">
          <Select id="gender" value={values.gender} onChange={(e) => set("gender", e.target.value as Student["gender"])} className="w-full">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </FormField>
        <FormField label="Date of Birth" htmlFor="dob" required error={errors.dob}>
          <Input {...field("dob")} type="date" />
        </FormField>
        <FormField label="B-Form / CNIC Number" htmlFor="bFormNumber" error={errors.bFormNumber} hint="13 digits, as on the NADRA B-Form.">
          <Input {...field("bFormNumber")} inputMode="numeric" placeholder="35202-1234567-1" />
        </FormField>
        <FormField label="Nationality" htmlFor="nationality">
          <Input {...field("nationality")} placeholder="e.g., Pakistani" />
        </FormField>
        <FormField label="Religion" htmlFor="religion" hint="Optional.">
          <Input {...field("religion")} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value as StudentStatus)} className="w-full">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </Section>

      <Section title="Health" description="Visible to staff who can open this student's profile, so teachers can act in an emergency.">
        <FormField label="Blood Group" htmlFor="bloodGroup">
          <Select id="bloodGroup" value={values.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="w-full">
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Medical Conditions & Allergies" htmlFor="medicalNotes" className="md:col-span-2" hint="Conditions, allergies, regular medication. Leave blank if none.">
          <Textarea {...field("medicalNotes")} rows={3} placeholder="e.g., Asthma — carries an inhaler. Allergic to peanuts." />
        </FormField>
      </Section>

      <Section title="Enrollment">
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
          <Input {...field("admissionNo")} placeholder="e.g., EDU-2026-0451" />
        </FormField>
        <FormField label="Admission Date" htmlFor="admissionDate">
          <Input {...field("admissionDate")} type="date" />
        </FormField>
        <FormField label="Previous School" htmlFor="previousSchool" className="md:col-span-2">
          <Input {...field("previousSchool")} placeholder="Leave blank for a first admission" />
        </FormField>
      </Section>

      <Section title="Parent / Guardian">
        <FormField label="Parent/Guardian Name" htmlFor="parentName" required error={errors.parentName}>
          <Input {...field("parentName")} placeholder="e.g., Mr. Tariq Khan" />
        </FormField>
        <FormField label="Relationship" htmlFor="parentRelation">
          <Input {...field("parentRelation")} list={RELATION_LIST_ID} placeholder="e.g., Father" />
        </FormField>
        <FormField label="Phone Number" htmlFor="parentPhone" required error={errors.parentPhone}>
          <Input {...field("parentPhone")} type="tel" placeholder="+92 300 1234567" />
        </FormField>
        <FormField label="Email" htmlFor="parentEmail">
          <Input {...field("parentEmail")} type="email" placeholder="parent@example.com" />
        </FormField>
        <FormField label="Address" htmlFor="address" className="md:col-span-2">
          <Input {...field("address")} placeholder="House #, Area, City" />
        </FormField>
      </Section>

      <Section title="Second Guardian" description="Optional — e.g. the other parent.">
        <FormField label="Name" htmlFor="secondaryGuardianName">
          <Input {...field("secondaryGuardianName")} />
        </FormField>
        <FormField label="Relationship" htmlFor="secondaryGuardianRelation">
          <Input {...field("secondaryGuardianRelation")} list={RELATION_LIST_ID} placeholder="e.g., Mother" />
        </FormField>
        <FormField label="Phone Number" htmlFor="secondaryGuardianPhone">
          <Input {...field("secondaryGuardianPhone")} type="tel" />
        </FormField>
        <FormField label="Email" htmlFor="secondaryGuardianEmail" error={errors.secondaryGuardianEmail}>
          <Input {...field("secondaryGuardianEmail")} type="email" />
        </FormField>
      </Section>

      <Section title="Emergency Contact" description="Someone the school can reach if the parents can't be contacted.">
        <FormField label="Name" htmlFor="emergencyContactName">
          <Input {...field("emergencyContactName")} />
        </FormField>
        <FormField label="Relationship" htmlFor="emergencyContactRelation">
          <Input {...field("emergencyContactRelation")} list={RELATION_LIST_ID} placeholder="e.g., Uncle" />
        </FormField>
        <FormField label="Phone Number" htmlFor="emergencyContactPhone">
          <Input {...field("emergencyContactPhone")} type="tel" />
        </FormField>
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
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
