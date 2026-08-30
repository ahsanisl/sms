"use client";

import { useAppData } from "@/lib/store/app-data-context";
import { useSchoolScope } from "@/lib/school-scope";
import type {
  AcademicSession,
  Announcement,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  Campus,
  ClassSection,
  Department,
  Exam,
  FeeCategory,
  FeeConcession,
  FeeInvoice,
  FeePayment,
  FeePaymentReversal,
  FeeStructureItem,
  GradeBand,
  Inquiry,
  LeaveRequest,
  MarksEntry,
  Period,
  PermissionModule,
  Role,
  Room,
  School,
  Student,
  Subject,
  Teacher,
  TimetableDay,
  TimetableSlot,
} from "@/lib/types";

export function usePermissions() {
  const { data, dispatch } = useAppData();
  return {
    routePermissions: data.routePermissions,
    setRolePermission: (role: Role, module: PermissionModule, allowed: boolean) =>
      dispatch({ type: "SET_ROLE_PERMISSION", payload: { role, module, allowed } }),
  };
}

/** The current viewer's own school (data.schools is already scoped to exactly it — see lib/store/school-scope.ts). Backs the Settings → School Profile form. */
export function useSchoolProfile() {
  const { data, dispatch } = useAppData();
  const school = data.schools[0];
  return {
    schoolProfile: school,
    updateSchoolProfile: (payload: Omit<School, "id" | "status" | "onboardingComplete">) =>
      dispatch({ type: "UPDATE_SCHOOL", payload: { ...payload, id: school.id, status: school.status, onboardingComplete: school.onboardingComplete } }),
    /** Separate from updateSchoolProfile so the branding form can't accidentally flip this — called only by the /onboarding wizard's Finish step. */
    completeOnboarding: () => dispatch({ type: "UPDATE_SCHOOL", payload: { ...school, onboardingComplete: true } }),
  };
}

/** Every account that can log in — deliberately unscoped (see AppDataState.users), so the login page can resolve any email before a session/school context exists. */
export function useUsers() {
  const { data } = useAppData();
  return { users: data.users };
}

/** Platform-admin only: every school at once, with cross-school aggregate stats. Reads rawData deliberately — the one place that needs to see every tenant, not just the viewer's own. */
export function useSchools() {
  const { rawData, dispatch } = useAppData();
  const statsFor = (schoolId: string) => {
    const campusIds = new Set(rawData.campuses.filter((c) => c.schoolId === schoolId).map((c) => c.id));
    const schoolStudentIds = new Set(rawData.students.filter((s) => campusIds.has(s.campusId)).map((s) => s.id));
    const currentMonthInvoices = rawData.invoices.filter((inv) => inv.month === "August 2026" && schoolStudentIds.has(inv.studentId));
    return {
      campuses: campusIds.size,
      students: schoolStudentIds.size,
      teachers: rawData.teachers.filter((t) => campusIds.has(t.campusId)).length,
      collected: currentMonthInvoices.reduce((s, i) => s + i.paidAmount, 0),
      outstanding: currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
    };
  };
  return {
    schools: rawData.schools,
    statsFor,
    addSchool: (payload: Omit<School, "id">) => dispatch({ type: "ADD_SCHOOL", payload }),
    /** Creates the school AND its first School Owner account together, atomically — a school should never exist with nobody able to log into it. The owner lands on the /onboarding wizard on first login, since the new school starts genuinely empty. */
    addSchoolWithOwner: (school: Omit<School, "id" | "onboardingComplete">, ownerName: string, ownerEmail: string) =>
      dispatch({ type: "ADD_SCHOOL_WITH_OWNER", payload: { school: { ...school, onboardingComplete: false }, ownerName, ownerEmail } }),
    updateSchool: (payload: School) => dispatch({ type: "UPDATE_SCHOOL", payload }),
    archiveSchool: (id: string) => dispatch({ type: "ARCHIVE_SCHOOL", payload: { id } }),
  };
}

export function useCampuses() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    campuses: data.campuses,
    addCampus: (payload: Omit<Campus, "id" | "schoolId">) =>
      dispatch({ type: "ADD_CAMPUS", payload: { ...payload, schoolId: effectiveSchoolId! } }),
    updateCampus: (payload: Campus) => dispatch({ type: "UPDATE_CAMPUS", payload }),
    archiveCampus: (id: string) => dispatch({ type: "ARCHIVE_CAMPUS", payload: { id } }),
  };
}

export function useSubjects() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    subjects: data.subjects,
    addSubject: (payload: Omit<Subject, "id" | "schoolId">) =>
      dispatch({ type: "ADD_SUBJECT", payload: { ...payload, schoolId: effectiveSchoolId! } }),
    updateSubject: (payload: Subject) => dispatch({ type: "UPDATE_SUBJECT", payload }),
    archiveSubject: (id: string) => dispatch({ type: "ARCHIVE_SUBJECT", payload: { id } }),
  };
}

export function useDepartments() {
  const { data, dispatch } = useAppData();
  return {
    departments: data.departments,
    addDepartment: (payload: Omit<Department, "id">) => dispatch({ type: "ADD_DEPARTMENT", payload }),
    updateDepartment: (payload: Department) => dispatch({ type: "UPDATE_DEPARTMENT", payload }),
    archiveDepartment: (id: string) => dispatch({ type: "ARCHIVE_DEPARTMENT", payload: { id } }),
  };
}

export function useFeeCategories() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    feeCategories: data.feeCategories,
    addFeeCategory: (payload: Omit<FeeCategory, "id" | "schoolId">) =>
      dispatch({ type: "ADD_FEE_CATEGORY", payload: { ...payload, schoolId: effectiveSchoolId! } }),
    updateFeeCategory: (payload: FeeCategory) => dispatch({ type: "UPDATE_FEE_CATEGORY", payload }),
    archiveFeeCategory: (id: string) => dispatch({ type: "ARCHIVE_FEE_CATEGORY", payload: { id } }),
  };
}

export function useSessions() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    sessions: data.sessions,
    addSession: (payload: Omit<AcademicSession, "id" | "schoolId">) =>
      dispatch({ type: "ADD_SESSION", payload: { ...payload, schoolId: effectiveSchoolId! } }),
    updateSession: (payload: AcademicSession) => dispatch({ type: "UPDATE_SESSION", payload }),
    setActiveSession: (id: string) => dispatch({ type: "SET_ACTIVE_SESSION", payload: { id } }),
  };
}

export function useStudents() {
  const { data, dispatch } = useAppData();
  return {
    students: data.students,
    lifecycleEvents: data.lifecycleEvents,
    addStudent: (payload: Omit<Student, "id">) => dispatch({ type: "ADD_STUDENT", payload }),
    updateStudent: (payload: Student) => dispatch({ type: "UPDATE_STUDENT", payload }),
    deleteStudent: (id: string) => dispatch({ type: "DELETE_STUDENT", payload: { id } }),
    withdrawStudent: (payload: { studentId: string; date: string; reason?: string; resultingStatus: "withdrawn" | "alumni"; leavingCertificateIssued?: boolean }) =>
      dispatch({ type: "WITHDRAW_STUDENT", payload }),
    reactivateStudent: (payload: { studentId: string; date: string; reason?: string }) => dispatch({ type: "REACTIVATE_STUDENT", payload }),
    transferStudent: (payload: { studentId: string; date: string; reason?: string; toClassId?: string; toCampusId?: string }) =>
      dispatch({ type: "TRANSFER_STUDENT", payload }),
    promoteStudents: (payload: { studentIds: string[]; fromClassId: string; date: string; toClassId?: string; toAlumni?: boolean }) =>
      dispatch({ type: "PROMOTE_STUDENTS", payload }),
    lifecycleForStudent: (studentId: string) => data.lifecycleEvents.filter((e) => e.studentId === studentId),
  };
}

export function useTeachers() {
  const { data, dispatch } = useAppData();
  return {
    teachers: data.teachers,
    addTeacher: (payload: Omit<Teacher, "id">) => dispatch({ type: "ADD_TEACHER", payload }),
    updateTeacher: (payload: Teacher) => dispatch({ type: "UPDATE_TEACHER", payload }),
    deleteTeacher: (id: string) => dispatch({ type: "DELETE_TEACHER", payload: { id } }),
  };
}

export function useClasses() {
  const { data, dispatch } = useAppData();
  return {
    classes: data.classes,
    addClass: (payload: Omit<ClassSection, "id">) => dispatch({ type: "ADD_CLASS", payload }),
    updateClass: (payload: ClassSection) => dispatch({ type: "UPDATE_CLASS", payload }),
    archiveClass: (id: string) => dispatch({ type: "ARCHIVE_CLASS", payload: { id } }),
  };
}

export function useAttendanceStore() {
  const { data, dispatch } = useAppData();
  return {
    attendance: data.attendance,
    markAttendanceBulk: (records: Omit<AttendanceRecord, "id">[]) =>
      dispatch({ type: "MARK_ATTENDANCE_BULK", payload: records }),
  };
}

export function useAttendanceCorrections() {
  const { data, dispatch } = useAppData();
  return {
    corrections: data.attendanceCorrections,
    addCorrection: (payload: Omit<AttendanceCorrectionRequest, "id" | "status" | "requestedAt">) =>
      dispatch({ type: "ADD_ATTENDANCE_CORRECTION", payload }),
    reviewCorrection: (payload: { id: string; status: "approved" | "rejected"; reviewedBy: string; reviewNote?: string }) =>
      dispatch({ type: "REVIEW_ATTENDANCE_CORRECTION", payload }),
  };
}

export function useFeesStore() {
  const { data, dispatch } = useAppData();
  return {
    feeStructure: data.feeStructure,
    invoices: data.invoices,
    payments: data.payments,
    concessions: data.concessions,
    reversals: data.reversals,
    addFeeStructureItem: (payload: Omit<FeeStructureItem, "id">) =>
      dispatch({ type: "ADD_FEE_STRUCTURE_ITEM", payload }),
    updateFeeStructureItem: (payload: FeeStructureItem) => dispatch({ type: "UPDATE_FEE_STRUCTURE_ITEM", payload }),
    deleteFeeStructureItem: (id: string) => dispatch({ type: "DELETE_FEE_STRUCTURE_ITEM", payload: { id } }),
    addInvoice: (payload: Omit<FeeInvoice, "id">) => dispatch({ type: "ADD_INVOICE", payload }),
    addInvoicesBulk: (payload: Omit<FeeInvoice, "id">[]) => dispatch({ type: "ADD_INVOICES_BULK", payload }),
    recordPayment: (payload: Omit<FeePayment, "id">) => dispatch({ type: "RECORD_PAYMENT", payload }),
    reversePayment: (payload: Omit<FeePaymentReversal, "id">) => dispatch({ type: "REVERSE_PAYMENT", payload }),
    applyConcession: (invoiceId: string, concession: Omit<FeeConcession, "id">) =>
      dispatch({ type: "APPLY_CONCESSION", payload: { invoiceId, concession } }),
  };
}

export function useExamsStore() {
  const { data, dispatch } = useAppData();
  return {
    exams: data.exams,
    marks: data.marks,
    addExam: (payload: Omit<Exam, "id" | "resultsPublished">) => dispatch({ type: "ADD_EXAM", payload }),
    publishResults: (examId: string) => dispatch({ type: "SET_EXAM_RESULTS_PUBLISHED", payload: { examId, published: true } }),
    unpublishResults: (examId: string) => dispatch({ type: "SET_EXAM_RESULTS_PUBLISHED", payload: { examId, published: false } }),
    enterMarksBulk: (entries: Omit<MarksEntry, "id">[]) => dispatch({ type: "ENTER_MARKS_BULK", payload: entries }),
  };
}

export function useGradeScale() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    gradeScale: data.gradeScale,
    setGradeScale: (bands: Omit<GradeBand, "schoolId">[]) =>
      dispatch({
        type: "SET_GRADE_SCALE",
        payload: { schoolId: effectiveSchoolId!, bands: bands.map((b) => ({ ...b, schoolId: effectiveSchoolId! })) },
      }),
  };
}

export function useTimetableStore() {
  const { data, dispatch } = useAppData();
  return {
    timetable: data.timetable,
    timetableDrafts: data.timetableDrafts,
    timetableStatus: data.timetableStatus,
    addSlot: (payload: Omit<TimetableSlot, "id">) => dispatch({ type: "ADD_TIMETABLE_SLOT", payload }),
    updateSlot: (payload: TimetableSlot) => dispatch({ type: "UPDATE_TIMETABLE_SLOT", payload }),
    /** Status defaults to "published" for any class the Builder has never touched. */
    statusForClass: (classId: string): "draft" | "published" => data.timetableStatus[classId] ?? "published",
    draftForClass: (classId: string) => data.timetableDrafts[classId],
    saveDraft: (classId: string, slots: TimetableSlot[]) => dispatch({ type: "SAVE_TIMETABLE_DRAFT", payload: { classId, slots } }),
    discardDraft: (classId: string) => dispatch({ type: "DISCARD_TIMETABLE_DRAFT", payload: { classId } }),
    publishDraft: (classId: string, slots: TimetableSlot[]) => dispatch({ type: "PUBLISH_TIMETABLE_DRAFT", payload: { classId, slots } }),
  };
}

export function useRooms() {
  const { data, dispatch } = useAppData();
  return {
    rooms: data.rooms,
    addRoom: (payload: Omit<Room, "id">) => dispatch({ type: "ADD_ROOM", payload }),
    updateRoom: (payload: Room) => dispatch({ type: "UPDATE_ROOM", payload }),
    archiveRoom: (id: string) => dispatch({ type: "ARCHIVE_ROOM", payload: { id } }),
  };
}

/** Backed by one TimetableConfig row per school (data.timetableConfigs is already scoped to exactly the viewer's own school). Public shape unchanged, so every consumer keeps reading workingDays/periods/breakAfterPeriod directly. */
export function useTimetableConfig() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  const config = data.timetableConfigs[0];
  return {
    workingDays: config?.workingDays ?? [],
    periods: config?.periods ?? [],
    breakAfterPeriod: config?.breakAfterPeriod ?? 0,
    setWorkingDays: (workingDays: TimetableDay[]) =>
      dispatch({ type: "SET_WORKING_DAYS", payload: { schoolId: effectiveSchoolId!, workingDays } }),
    setPeriods: (periods: Period[], breakAfterPeriod: number) =>
      dispatch({ type: "SET_PERIODS", payload: { schoolId: effectiveSchoolId!, periods, breakAfterPeriod } }),
  };
}

export function useAnnouncementsStore() {
  const { data, dispatch } = useAppData();
  const { effectiveSchoolId } = useSchoolScope();
  return {
    announcements: data.announcements,
    addAnnouncement: (payload: Omit<Announcement, "id" | "schoolId">) =>
      dispatch({ type: "ADD_ANNOUNCEMENT", payload: { ...payload, schoolId: effectiveSchoolId! } }),
    deleteAnnouncement: (id: string) => dispatch({ type: "DELETE_ANNOUNCEMENT", payload: { id } }),
  };
}

export function useLeaveStore() {
  const { data, dispatch } = useAppData();
  return {
    leaveRequests: data.leaveRequests,
    addLeaveRequest: (payload: Omit<LeaveRequest, "id" | "status" | "requestedAt">) => dispatch({ type: "ADD_LEAVE_REQUEST", payload }),
    reviewLeaveRequest: (payload: { id: string; status: "approved" | "rejected"; reviewedBy: string; reviewNote?: string }) =>
      dispatch({ type: "REVIEW_LEAVE_REQUEST", payload }),
  };
}

export function useAdmissions() {
  const { data, dispatch } = useAppData();
  return {
    inquiries: data.inquiries,
    addInquiry: (payload: Omit<Inquiry, "id" | "stage" | "createdAt" | "updatedAt" | "convertedStudentId">) =>
      dispatch({ type: "ADD_INQUIRY", payload }),
    updateInquiry: (payload: Inquiry) => dispatch({ type: "UPDATE_INQUIRY", payload }),
    updateInquiryStage: (id: string, stage: Inquiry["stage"]) => dispatch({ type: "UPDATE_INQUIRY_STAGE", payload: { id, stage } }),
    convertInquiryToStudent: (inquiryId: string, student: Omit<Student, "id">) =>
      dispatch({ type: "CONVERT_INQUIRY_TO_STUDENT", payload: { inquiryId, student } }),
  };
}
