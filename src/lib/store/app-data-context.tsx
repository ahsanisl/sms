"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
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
  SchoolProfile,
  Student,
  StudentLifecycleEvent,
  Subject,
  Teacher,
  TimetableDay,
  TimetableSlot,
  TimetableStatus,
} from "@/lib/types";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import {
  ANNOUNCEMENTS,
  ATTENDANCE,
  BREAK_AFTER_PERIOD,
  CAMPUSES,
  CLASSES,
  DAYS,
  DEPARTMENTS,
  EXAMS,
  FEE_CATEGORIES,
  FEE_INVOICES,
  FEE_PAYMENTS,
  FEE_STRUCTURE,
  GRADE_SCALE,
  INQUIRIES,
  MARKS_ENTRIES,
  PERIODS,
  ROOMS,
  STUDENTS,
  SUBJECTS,
  syncAttendance,
  syncCampuses,
  syncClasses,
  syncDepartments,
  syncExams,
  syncFeeCategories,
  syncFeeInvoices,
  syncFeePayments,
  syncGradeScale,
  syncInquiries,
  syncMarks,
  syncRooms,
  syncStudents,
  syncSubjects,
  syncTeachers,
  syncTimetable,
  TEACHERS,
  TIMETABLE,
} from "@/lib/mock";
import { DEFAULT_SESSIONS } from "@/lib/mock/sessions";

const STORAGE_KEY = "eduflow-app-data-v14";

interface AppDataState {
  routePermissions: Record<Role, Record<PermissionModule, boolean>>;
  schoolProfile: SchoolProfile;
  campuses: Campus[];
  subjects: Subject[];
  departments: Department[];
  sessions: AcademicSession[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassSection[];
  attendance: AttendanceRecord[];
  attendanceCorrections: AttendanceCorrectionRequest[];
  feeCategories: FeeCategory[];
  feeStructure: FeeStructureItem[];
  invoices: FeeInvoice[];
  payments: FeePayment[];
  concessions: FeeConcession[];
  reversals: FeePaymentReversal[];
  exams: Exam[];
  marks: MarksEntry[];
  gradeScale: GradeBand[];
  rooms: Room[];
  workingDays: TimetableDay[];
  periods: Period[];
  breakAfterPeriod: number;
  timetable: TimetableSlot[];
  /** Per-class in-progress edits from the Timetable Builder, not yet published (invisible to Teacher/Parent views). */
  timetableDrafts: Record<string, TimetableSlot[]>;
  /** Per-class publish state. A class with no entry here has never been edited via the Builder and is treated as "published". */
  timetableStatus: Record<string, TimetableStatus>;
  announcements: Announcement[];
  lifecycleEvents: StudentLifecycleEvent[];
  leaveRequests: LeaveRequest[];
  inquiries: Inquiry[];
}

function seedState(): AppDataState {
  return {
    routePermissions: DEFAULT_ROLE_PERMISSIONS,
    schoolProfile: {
      name: "EduFlow Academy",
      tagline: "Excellence in Education Since 2005",
      address: "Shahrah-e-Faisal, Karachi, Pakistan",
      phone: "+92 21 3456 7890",
      email: "info@eduflow.edu.pk",
      logoEmoji: "🎓",
      reportCardFooter: "This is a computer-generated report card and does not require a signature.",
      showSignatureLines: true,
    },
    campuses: CAMPUSES,
    subjects: SUBJECTS,
    departments: DEPARTMENTS,
    sessions: DEFAULT_SESSIONS,
    students: STUDENTS,
    teachers: TEACHERS,
    classes: CLASSES,
    attendance: ATTENDANCE,
    attendanceCorrections: [],
    feeCategories: FEE_CATEGORIES,
    feeStructure: FEE_STRUCTURE,
    invoices: FEE_INVOICES,
    payments: FEE_PAYMENTS,
    concessions: [],
    reversals: [],
    exams: EXAMS,
    marks: MARKS_ENTRIES,
    gradeScale: GRADE_SCALE,
    rooms: ROOMS,
    workingDays: DAYS,
    periods: PERIODS,
    breakAfterPeriod: BREAK_AFTER_PERIOD,
    timetable: TIMETABLE,
    timetableDrafts: {},
    timetableStatus: {},
    announcements: ANNOUNCEMENTS,
    lifecycleEvents: [],
    leaveRequests: [],
    inquiries: INQUIRIES,
  };
}

let nextId = 100000;
function genId(prefix: string) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function applyConcessionToInvoice(invoice: FeeInvoice, concession: FeeConcession): FeeInvoice {
  const preDiscountSubtotal = invoice.items.filter((i) => !i.isDiscount).reduce((s, i) => s + i.amount, 0);
  const discountAmount = concession.percentage != null ? Math.round((preDiscountSubtotal * concession.percentage) / 100) : (concession.amount ?? 0);
  const items = [...invoice.items, { name: concession.label, amount: -discountAmount, isDiscount: true }];
  const totalAmount = Math.max(0, invoice.totalAmount - discountAmount);
  const status = invoice.paidAmount >= totalAmount ? "paid" : invoice.paidAmount > 0 ? "partial" : invoice.status;
  return { ...invoice, items, totalAmount, status };
}

type Action =
  | { type: "SET_ROLE_PERMISSION"; payload: { role: Role; module: PermissionModule; allowed: boolean } }
  | { type: "UPDATE_SCHOOL_PROFILE"; payload: SchoolProfile }
  | { type: "ADD_CAMPUS"; payload: Omit<Campus, "id"> }
  | { type: "UPDATE_CAMPUS"; payload: Campus }
  | { type: "ARCHIVE_CAMPUS"; payload: { id: string } }
  | { type: "ADD_SUBJECT"; payload: Omit<Subject, "id"> }
  | { type: "UPDATE_SUBJECT"; payload: Subject }
  | { type: "ARCHIVE_SUBJECT"; payload: { id: string } }
  | { type: "ADD_DEPARTMENT"; payload: Omit<Department, "id"> }
  | { type: "UPDATE_DEPARTMENT"; payload: Department }
  | { type: "ARCHIVE_DEPARTMENT"; payload: { id: string } }
  | { type: "ADD_SESSION"; payload: Omit<AcademicSession, "id"> }
  | { type: "UPDATE_SESSION"; payload: AcademicSession }
  | { type: "SET_ACTIVE_SESSION"; payload: { id: string } }
  | { type: "ADD_STUDENT"; payload: Omit<Student, "id"> }
  | { type: "UPDATE_STUDENT"; payload: Student }
  | { type: "DELETE_STUDENT"; payload: { id: string } }
  | {
      type: "WITHDRAW_STUDENT";
      payload: { studentId: string; date: string; reason?: string; resultingStatus: "withdrawn" | "alumni"; leavingCertificateIssued?: boolean };
    }
  | { type: "REACTIVATE_STUDENT"; payload: { studentId: string; date: string; reason?: string } }
  | {
      type: "TRANSFER_STUDENT";
      payload: { studentId: string; date: string; reason?: string; toClassId?: string; toCampusId?: string };
    }
  | {
      type: "PROMOTE_STUDENTS";
      payload: { studentIds: string[]; fromClassId: string; date: string; toClassId?: string; toAlumni?: boolean };
    }
  | { type: "ADD_TEACHER"; payload: Omit<Teacher, "id"> }
  | { type: "UPDATE_TEACHER"; payload: Teacher }
  | { type: "DELETE_TEACHER"; payload: { id: string } }
  | { type: "ADD_CLASS"; payload: Omit<ClassSection, "id"> }
  | { type: "UPDATE_CLASS"; payload: ClassSection }
  | { type: "ARCHIVE_CLASS"; payload: { id: string } }
  | { type: "MARK_ATTENDANCE_BULK"; payload: Omit<AttendanceRecord, "id">[] }
  | { type: "ADD_ATTENDANCE_CORRECTION"; payload: Omit<AttendanceCorrectionRequest, "id" | "status" | "requestedAt"> }
  | {
      type: "REVIEW_ATTENDANCE_CORRECTION";
      payload: { id: string; status: "approved" | "rejected"; reviewedBy: string; reviewNote?: string };
    }
  | { type: "ADD_FEE_CATEGORY"; payload: Omit<FeeCategory, "id"> }
  | { type: "UPDATE_FEE_CATEGORY"; payload: FeeCategory }
  | { type: "ARCHIVE_FEE_CATEGORY"; payload: { id: string } }
  | { type: "ADD_FEE_STRUCTURE_ITEM"; payload: Omit<FeeStructureItem, "id"> }
  | { type: "UPDATE_FEE_STRUCTURE_ITEM"; payload: FeeStructureItem }
  | { type: "DELETE_FEE_STRUCTURE_ITEM"; payload: { id: string } }
  | { type: "ADD_INVOICE"; payload: Omit<FeeInvoice, "id"> }
  | { type: "ADD_INVOICES_BULK"; payload: Omit<FeeInvoice, "id">[] }
  | { type: "RECORD_PAYMENT"; payload: Omit<FeePayment, "id"> }
  | { type: "REVERSE_PAYMENT"; payload: Omit<FeePaymentReversal, "id"> }
  | { type: "APPLY_CONCESSION"; payload: { invoiceId: string; concession: Omit<FeeConcession, "id"> } }
  | { type: "ADD_EXAM"; payload: Omit<Exam, "id" | "resultsPublished"> }
  | { type: "SET_EXAM_RESULTS_PUBLISHED"; payload: { examId: string; published: boolean } }
  | { type: "ENTER_MARKS_BULK"; payload: Omit<MarksEntry, "id">[] }
  | { type: "SET_GRADE_SCALE"; payload: GradeBand[] }
  | { type: "ADD_TIMETABLE_SLOT"; payload: Omit<TimetableSlot, "id"> }
  | { type: "UPDATE_TIMETABLE_SLOT"; payload: TimetableSlot }
  | { type: "ADD_ROOM"; payload: Omit<Room, "id"> }
  | { type: "UPDATE_ROOM"; payload: Room }
  | { type: "ARCHIVE_ROOM"; payload: { id: string } }
  | { type: "SET_WORKING_DAYS"; payload: TimetableDay[] }
  | { type: "SET_PERIODS"; payload: { periods: Period[]; breakAfterPeriod: number } }
  | { type: "SAVE_TIMETABLE_DRAFT"; payload: { classId: string; slots: TimetableSlot[] } }
  | { type: "DISCARD_TIMETABLE_DRAFT"; payload: { classId: string } }
  | { type: "PUBLISH_TIMETABLE_DRAFT"; payload: { classId: string; slots: TimetableSlot[] } }
  | { type: "ADD_ANNOUNCEMENT"; payload: Omit<Announcement, "id"> }
  | { type: "DELETE_ANNOUNCEMENT"; payload: { id: string } }
  | { type: "ADD_LEAVE_REQUEST"; payload: Omit<LeaveRequest, "id" | "status" | "requestedAt"> }
  | { type: "REVIEW_LEAVE_REQUEST"; payload: { id: string; status: "approved" | "rejected"; reviewedBy: string; reviewNote?: string } }
  | { type: "ADD_INQUIRY"; payload: Omit<Inquiry, "id" | "stage" | "createdAt" | "updatedAt" | "convertedStudentId"> }
  | { type: "UPDATE_INQUIRY"; payload: Inquiry }
  | { type: "UPDATE_INQUIRY_STAGE"; payload: { id: string; stage: Inquiry["stage"] } }
  | { type: "CONVERT_INQUIRY_TO_STUDENT"; payload: { inquiryId: string; student: Omit<Student, "id"> } }
  | { type: "RESET" }
  | { type: "HYDRATE"; payload: AppDataState };

function reducer(state: AppDataState, action: Action): AppDataState {
  switch (action.type) {
    case "SET_ROLE_PERMISSION": {
      const { role, module, allowed } = action.payload;
      return {
        ...state,
        routePermissions: {
          ...state.routePermissions,
          [role]: { ...state.routePermissions[role], [module]: allowed },
        },
      };
    }

    case "UPDATE_SCHOOL_PROFILE":
      return { ...state, schoolProfile: action.payload };

    case "ADD_CAMPUS":
      return { ...state, campuses: [...state.campuses, { ...action.payload, id: genId("campus") }] };
    case "UPDATE_CAMPUS":
      return { ...state, campuses: state.campuses.map((c) => (c.id === action.payload.id ? action.payload : c)) };
    case "ARCHIVE_CAMPUS":
      return { ...state, campuses: state.campuses.map((c) => (c.id === action.payload.id ? { ...c, status: "archived" } : c)) };

    case "ADD_SUBJECT":
      return { ...state, subjects: [...state.subjects, { ...action.payload, id: genId("subj") }] };
    case "UPDATE_SUBJECT":
      return { ...state, subjects: state.subjects.map((s) => (s.id === action.payload.id ? action.payload : s)) };
    case "ARCHIVE_SUBJECT":
      return { ...state, subjects: state.subjects.map((s) => (s.id === action.payload.id ? { ...s, status: "archived" } : s)) };

    case "ADD_DEPARTMENT":
      return { ...state, departments: [...state.departments, { ...action.payload, id: genId("dept") }] };
    case "UPDATE_DEPARTMENT":
      return { ...state, departments: state.departments.map((d) => (d.id === action.payload.id ? action.payload : d)) };
    case "ARCHIVE_DEPARTMENT":
      return { ...state, departments: state.departments.map((d) => (d.id === action.payload.id ? { ...d, status: "archived" } : d)) };

    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, { ...action.payload, id: genId("sess") }] };
    case "UPDATE_SESSION":
      return { ...state, sessions: state.sessions.map((s) => (s.id === action.payload.id ? action.payload : s)) };
    case "SET_ACTIVE_SESSION":
      return { ...state, sessions: state.sessions.map((s) => ({ ...s, isActive: s.id === action.payload.id })) };

    case "ADD_STUDENT":
      return { ...state, students: [{ ...action.payload, id: genId("s") }, ...state.students] };
    case "UPDATE_STUDENT":
      return { ...state, students: state.students.map((s) => (s.id === action.payload.id ? action.payload : s)) };
    case "DELETE_STUDENT":
      return { ...state, students: state.students.filter((s) => s.id !== action.payload.id) };

    case "WITHDRAW_STUDENT": {
      const { studentId, date, reason, resultingStatus, leavingCertificateIssued } = action.payload;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, status: resultingStatus } : s));
      const event: StudentLifecycleEvent = {
        id: genId("lc"),
        studentId,
        type: "withdrawal",
        date,
        reason,
        resultingStatus,
        leavingCertificateIssued,
      };
      return { ...state, students, lifecycleEvents: [event, ...state.lifecycleEvents] };
    }

    case "REACTIVATE_STUDENT": {
      const { studentId, date, reason } = action.payload;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, status: "active" as const } : s));
      const event: StudentLifecycleEvent = { id: genId("lc"), studentId, type: "reactivation", date, reason, resultingStatus: "active" };
      return { ...state, students, lifecycleEvents: [event, ...state.lifecycleEvents] };
    }

    case "TRANSFER_STUDENT": {
      const { studentId, date, reason, toClassId, toCampusId } = action.payload;
      const student = state.students.find((s) => s.id === studentId);
      if (!student) return state;
      const students = state.students.map((s) =>
        s.id === studentId ? { ...s, classId: toClassId ?? s.classId, campusId: toCampusId ?? s.campusId } : s,
      );
      const event: StudentLifecycleEvent = {
        id: genId("lc"),
        studentId,
        type: "transfer",
        date,
        reason,
        fromClassId: student.classId,
        toClassId: toClassId ?? student.classId,
        fromCampusId: student.campusId,
        toCampusId: toCampusId ?? student.campusId,
      };
      return { ...state, students, lifecycleEvents: [event, ...state.lifecycleEvents] };
    }

    case "PROMOTE_STUDENTS": {
      const { studentIds, fromClassId, date, toClassId, toAlumni } = action.payload;
      const idSet = new Set(studentIds);
      const students = state.students.map((s) => {
        if (!idSet.has(s.id)) return s;
        return toAlumni ? { ...s, status: "alumni" as const } : { ...s, classId: toClassId ?? s.classId };
      });
      const events: StudentLifecycleEvent[] = studentIds.map((studentId) => ({
        id: genId("lc"),
        studentId,
        type: "promotion",
        date,
        fromClassId,
        toClassId: toAlumni ? undefined : toClassId,
        resultingStatus: toAlumni ? "alumni" : undefined,
      }));
      return { ...state, students, lifecycleEvents: [...events, ...state.lifecycleEvents] };
    }

    case "ADD_TEACHER":
      return { ...state, teachers: [{ ...action.payload, id: genId("t") }, ...state.teachers] };
    case "UPDATE_TEACHER":
      return { ...state, teachers: state.teachers.map((t) => (t.id === action.payload.id ? action.payload : t)) };
    case "DELETE_TEACHER":
      return { ...state, teachers: state.teachers.filter((t) => t.id !== action.payload.id) };

    case "ADD_CLASS":
      return { ...state, classes: [...state.classes, { ...action.payload, id: genId("c") }] };
    case "UPDATE_CLASS":
      return { ...state, classes: state.classes.map((c) => (c.id === action.payload.id ? action.payload : c)) };
    case "ARCHIVE_CLASS":
      return { ...state, classes: state.classes.map((c) => (c.id === action.payload.id ? { ...c, status: "archived" } : c)) };

    case "MARK_ATTENDANCE_BULK": {
      const byKey = new Map(state.attendance.map((a) => [`${a.studentId}|${a.date}`, a]));
      for (const rec of action.payload) {
        byKey.set(`${rec.studentId}|${rec.date}`, { ...rec, id: genId("att") });
      }
      return { ...state, attendance: Array.from(byKey.values()) };
    }

    case "ADD_ATTENDANCE_CORRECTION": {
      const request: AttendanceCorrectionRequest = { ...action.payload, id: genId("corr"), status: "pending", requestedAt: new Date().toISOString() };
      return { ...state, attendanceCorrections: [request, ...state.attendanceCorrections] };
    }

    case "REVIEW_ATTENDANCE_CORRECTION": {
      const { id, status, reviewedBy, reviewNote } = action.payload;
      const request = state.attendanceCorrections.find((r) => r.id === id);
      if (!request) return state;
      const attendanceCorrections = state.attendanceCorrections.map((r) => (r.id === id ? { ...r, status, reviewedBy, reviewNote } : r));
      if (status !== "approved") {
        return { ...state, attendanceCorrections };
      }
      const attendance = state.attendance.map((a) =>
        a.studentId === request.studentId && a.date === request.date ? { ...a, status: request.requestedStatus } : a,
      );
      return { ...state, attendance, attendanceCorrections };
    }

    case "ADD_FEE_CATEGORY":
      return { ...state, feeCategories: [...state.feeCategories, { ...action.payload, id: genId("fc") }] };
    case "UPDATE_FEE_CATEGORY":
      return { ...state, feeCategories: state.feeCategories.map((c) => (c.id === action.payload.id ? action.payload : c)) };
    case "ARCHIVE_FEE_CATEGORY":
      return { ...state, feeCategories: state.feeCategories.map((c) => (c.id === action.payload.id ? { ...c, status: "archived" } : c)) };

    case "ADD_FEE_STRUCTURE_ITEM":
      return { ...state, feeStructure: [{ ...action.payload, id: genId("fs") }, ...state.feeStructure] };
    case "UPDATE_FEE_STRUCTURE_ITEM":
      return { ...state, feeStructure: state.feeStructure.map((f) => (f.id === action.payload.id ? action.payload : f)) };
    case "DELETE_FEE_STRUCTURE_ITEM":
      return { ...state, feeStructure: state.feeStructure.filter((f) => f.id !== action.payload.id) };

    case "ADD_INVOICE":
      return { ...state, invoices: [{ ...action.payload, id: genId("inv") }, ...state.invoices] };

    case "ADD_INVOICES_BULK":
      return { ...state, invoices: [...action.payload.map((inv) => ({ ...inv, id: genId("inv") })), ...state.invoices] };

    case "RECORD_PAYMENT": {
      const payment: FeePayment = { ...action.payload, id: genId("pay") };
      const invoices = state.invoices.map((inv) => {
        if (inv.id !== payment.invoiceId) return inv;
        const paidAmount = Math.min(inv.totalAmount, inv.paidAmount + payment.amount);
        const status = paidAmount >= inv.totalAmount ? "paid" : paidAmount > 0 ? "partial" : inv.status;
        return { ...inv, paidAmount, status };
      });
      return { ...state, invoices, payments: [payment, ...state.payments] };
    }

    case "REVERSE_PAYMENT": {
      const reversal: FeePaymentReversal = { ...action.payload, id: genId("rev") };
      const invoices = state.invoices.map((inv) => {
        if (inv.id !== reversal.invoiceId) return inv;
        const paidAmount = Math.max(0, inv.paidAmount - reversal.amount);
        const status: FeeInvoice["status"] = paidAmount >= inv.totalAmount ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
        return { ...inv, paidAmount, status };
      });
      return { ...state, invoices, reversals: [reversal, ...state.reversals] };
    }

    case "APPLY_CONCESSION": {
      const concession: FeeConcession = { ...action.payload.concession, id: genId("con") };
      const invoices = state.invoices.map((inv) => (inv.id === action.payload.invoiceId ? applyConcessionToInvoice(inv, concession) : inv));
      return { ...state, invoices, concessions: [concession, ...state.concessions] };
    }

    case "ADD_EXAM":
      return { ...state, exams: [{ ...action.payload, id: genId("exam"), resultsPublished: false }, ...state.exams] };

    case "SET_EXAM_RESULTS_PUBLISHED":
      return {
        ...state,
        exams: state.exams.map((e) => (e.id === action.payload.examId ? { ...e, resultsPublished: action.payload.published } : e)),
      };

    case "ENTER_MARKS_BULK": {
      const byKey = new Map(state.marks.map((m) => [`${m.examId}|${m.studentId}|${m.subjectId}`, m]));
      for (const entry of action.payload) {
        byKey.set(`${entry.examId}|${entry.studentId}|${entry.subjectId}`, { ...entry, id: genId("marks") });
      }
      return { ...state, marks: Array.from(byKey.values()) };
    }

    case "SET_GRADE_SCALE":
      return { ...state, gradeScale: action.payload };

    case "ADD_TIMETABLE_SLOT":
      return { ...state, timetable: [...state.timetable, { ...action.payload, id: genId("tt") }] };
    case "UPDATE_TIMETABLE_SLOT":
      return { ...state, timetable: state.timetable.map((t) => (t.id === action.payload.id ? action.payload : t)) };

    case "ADD_ROOM":
      return { ...state, rooms: [...state.rooms, { ...action.payload, id: genId("room") }] };
    case "UPDATE_ROOM":
      return { ...state, rooms: state.rooms.map((r) => (r.id === action.payload.id ? action.payload : r)) };
    case "ARCHIVE_ROOM":
      return { ...state, rooms: state.rooms.map((r) => (r.id === action.payload.id ? { ...r, status: "archived" } : r)) };

    case "SET_WORKING_DAYS":
      return { ...state, workingDays: action.payload };
    case "SET_PERIODS":
      return { ...state, periods: action.payload.periods, breakAfterPeriod: action.payload.breakAfterPeriod };

    case "SAVE_TIMETABLE_DRAFT":
      return {
        ...state,
        timetableDrafts: { ...state.timetableDrafts, [action.payload.classId]: action.payload.slots },
        timetableStatus: { ...state.timetableStatus, [action.payload.classId]: "draft" },
      };

    case "DISCARD_TIMETABLE_DRAFT": {
      const timetableDrafts = { ...state.timetableDrafts };
      delete timetableDrafts[action.payload.classId];
      const timetableStatus = { ...state.timetableStatus, [action.payload.classId]: "published" as const };
      return { ...state, timetableDrafts, timetableStatus };
    }

    case "PUBLISH_TIMETABLE_DRAFT": {
      const { classId, slots } = action.payload;
      const timetable = [...state.timetable.filter((t) => t.classId !== classId), ...slots];
      const timetableDrafts = { ...state.timetableDrafts };
      delete timetableDrafts[classId];
      const timetableStatus = { ...state.timetableStatus, [classId]: "published" as const };
      return { ...state, timetable, timetableDrafts, timetableStatus };
    }

    case "ADD_ANNOUNCEMENT":
      return { ...state, announcements: [{ ...action.payload, id: genId("an") }, ...state.announcements] };
    case "DELETE_ANNOUNCEMENT":
      return { ...state, announcements: state.announcements.filter((a) => a.id !== action.payload.id) };

    case "ADD_LEAVE_REQUEST": {
      const request: LeaveRequest = { ...action.payload, id: genId("leave"), status: "pending", requestedAt: new Date().toISOString() };
      return { ...state, leaveRequests: [request, ...state.leaveRequests] };
    }

    case "REVIEW_LEAVE_REQUEST": {
      const { id, status, reviewedBy, reviewNote } = action.payload;
      return { ...state, leaveRequests: state.leaveRequests.map((r) => (r.id === id ? { ...r, status, reviewedBy, reviewNote } : r)) };
    }

    case "ADD_INQUIRY": {
      const now = new Date().toISOString().slice(0, 10);
      const inquiry: Inquiry = { ...action.payload, id: genId("inq"), stage: "inquiry", createdAt: now, updatedAt: now };
      return { ...state, inquiries: [inquiry, ...state.inquiries] };
    }

    case "UPDATE_INQUIRY":
      return { ...state, inquiries: state.inquiries.map((i) => (i.id === action.payload.id ? action.payload : i)) };

    case "UPDATE_INQUIRY_STAGE": {
      const { id, stage } = action.payload;
      const now = new Date().toISOString().slice(0, 10);
      return { ...state, inquiries: state.inquiries.map((i) => (i.id === id ? { ...i, stage, updatedAt: now } : i)) };
    }

    case "CONVERT_INQUIRY_TO_STUDENT": {
      const { inquiryId, student } = action.payload;
      const newStudent: Student = { ...student, id: genId("s") };
      const now = new Date().toISOString().slice(0, 10);
      const inquiries = state.inquiries.map((i) =>
        i.id === inquiryId ? { ...i, stage: "admitted" as const, updatedAt: now, convertedStudentId: newStudent.id } : i,
      );
      return { ...state, students: [newStudent, ...state.students], inquiries };
    }

    case "RESET":
      return seedState();

    case "HYDRATE":
      return action.payload;

    default:
      return state;
  }
}

function loadInitialState(): AppDataState {
  return seedState();
}

interface AppDataContextValue {
  data: AppDataState;
  dispatch: React.Dispatch<Action>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount (client only) so a demo
  // walkthrough survives a refresh. The persistence effect below is gated on
  // `hydrated` so it can't fire (and clobber the saved state with the fresh
  // seed) before this hydration attempt has had a chance to run.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppDataState;
        dispatch({ type: "HYDRATE", payload: parsed });
      }
    } catch {
      // ignore malformed storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }, [data, hydrated]);

  // Keep the mutable reference-data mirrors (CAMPUSES/SUBJECTS/CLASSES/
  // TEACHERS/ROOMS/TIMETABLE/STUDENTS/ATTENDANCE/EXAMS/MARKS_ENTRIES/
  // FEE_INVOICES/FEE_PAYMENTS across lib/mock/*.ts) pointed at the latest
  // store state, so the many plain lookup helpers (classLabel, campusName,
  // teacherName, subjectName, roomName, timetableForClass,
  // timetableForTeacher, studentName, attendanceForStudent, invoicesForStudent,
  // marksForStudent*) and dropdown sources that read those arrays directly
  // stay correct after an edit/add/archive. See the comment atop
  // reference-data.ts for why this indirection exists.
  //
  // Deliberately NOT a useEffect: effects run after commit, one render behind
  // the state that triggered them. That's invisible during normal use (a
  // dispatch always re-renders every consumer of this context anyway, so the
  // one-render lag resolves before paint), but it's observable on a hard page
  // reload — the mount render seeds these mirrors from the pre-hydration
  // state, hydration dispatches a second render before the first sync effect
  // ever runs, and a child that reads a mirror directly (e.g. a class or
  // teacher detail page's Timetable tab) can commit that stale read with
  // nothing left to force a further re-render. Calling the sync functions
  // here, in the render body, runs them before any child of this provider
  // renders (React always finishes a parent's render before its children's),
  // so every mirror is current for every render pass, including the very
  // first one after hydration. This is safe specifically because it's a
  // plain, idempotent reassignment of a module-scope binding — it doesn't
  // read from or write to component state, so re-running it on a
  // double-invoked (Strict Mode) or discarded render changes nothing.
  syncCampuses(data.campuses);
  syncSubjects(data.subjects);
  syncClasses(data.classes);
  syncTeachers(data.teachers);
  syncRooms(data.rooms);
  syncTimetable(data.timetable);
  syncStudents(data.students);
  syncAttendance(data.attendance);
  syncExams(data.exams);
  syncMarks(data.marks);
  syncFeeInvoices(data.invoices);
  syncFeePayments(data.payments);
  syncInquiries(data.inquiries);
  syncFeeCategories(data.feeCategories);
  syncGradeScale(data.gradeScale);
  syncDepartments(data.departments);

  const value = useMemo(() => ({ data, dispatch }), [data]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
