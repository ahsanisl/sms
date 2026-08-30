import type { AppDataState } from "@/lib/store/app-data-context";

/**
 * The single place multi-school isolation happens. Called once, inside
 * AppDataProvider, rather than duplicated as a `campusId === X` filter
 * across the ~26 pages that already scope by campus — those pages, and
 * every hook in hooks.ts, keep reading `data` exactly as before; it now
 * simply arrives pre-filtered to the viewer's own school.
 *
 * Filtering cascades through existing foreign keys: Campus.schoolId,
 * Subject.schoolId, FeeCategory.schoolId, GradeBand.schoolId,
 * AcademicSession.schoolId, and TimetableConfig.schoolId are all direct.
 * Everything else derives its school transitively via campusId
 * (Class/Teacher/Room/Department/Exam/Inquiry/FeeStructureItem/Student),
 * then via those via classId/examId/studentId/teacherId
 * (Attendance/Timetable/Marks/Invoices&Payments&Concessions&Reversals&
 * LifecycleEvents/LeaveRequests). Announcement carries a direct schoolId
 * since it can be campus-less ("all campuses in my school").
 *
 * Deliberately still NOT scoped (shared/global across every school — a
 * pragmatic simplification, see the multi-tenant plan): routePermissions.
 *
 * When `schoolId` is undefined (platform_admin, who never drills into one
 * school's live operational data — see the Platform Admin console), every
 * operational slice comes back empty and `schools` comes back full, since
 * that's the one screen that legitimately needs to see every tenant.
 */
export function scopeDataToSchool(state: AppDataState, schoolId: string | undefined): AppDataState {
  if (!schoolId) {
    return {
      ...state,
      schools: state.schools,
      campuses: [],
      subjects: [],
      classes: [],
      teachers: [],
      rooms: [],
      departments: [],
      sessions: [],
      exams: [],
      inquiries: [],
      feeCategories: [],
      feeStructure: [],
      gradeScale: [],
      timetableConfigs: [],
      students: [],
      attendance: [],
      attendanceCorrections: [],
      timetable: [],
      timetableDrafts: {},
      timetableStatus: {},
      marks: [],
      invoices: [],
      payments: [],
      concessions: [],
      reversals: [],
      lifecycleEvents: [],
      leaveRequests: [],
      announcements: [],
    };
  }

  const campuses = state.campuses.filter((c) => c.schoolId === schoolId);
  const campusIds = new Set(campuses.map((c) => c.id));
  const inCampus = (x: { campusId: string }) => campusIds.has(x.campusId);
  const inSchool = (x: { schoolId: string }) => x.schoolId === schoolId;

  const subjects = state.subjects.filter(inSchool);
  const classes = state.classes.filter(inCampus);
  const classIds = new Set(classes.map((c) => c.id));
  const teachers = state.teachers.filter(inCampus);
  const teacherIds = new Set(teachers.map((t) => t.id));
  const rooms = state.rooms.filter(inCampus);
  const departments = state.departments.filter(inCampus);
  const sessions = state.sessions.filter(inSchool);
  const exams = state.exams.filter(inCampus);
  const examIds = new Set(exams.map((e) => e.id));
  const inquiries = state.inquiries.filter(inCampus);
  const feeCategories = state.feeCategories.filter(inSchool);
  const feeStructure = state.feeStructure.filter(inCampus);
  const gradeScale = state.gradeScale.filter(inSchool);
  const timetableConfigs = state.timetableConfigs.filter(inSchool);
  const students = state.students.filter(inCampus);
  const studentIds = new Set(students.map((s) => s.id));

  const attendance = state.attendance.filter((a) => classIds.has(a.classId));
  const attendanceCorrections = state.attendanceCorrections.filter((a) => classIds.has(a.classId));
  const timetable = state.timetable.filter((t) => classIds.has(t.classId));
  const timetableDrafts = Object.fromEntries(Object.entries(state.timetableDrafts).filter(([classId]) => classIds.has(classId)));
  const timetableStatus = Object.fromEntries(Object.entries(state.timetableStatus).filter(([classId]) => classIds.has(classId)));
  const marks = state.marks.filter((m) => examIds.has(m.examId));
  const invoices = state.invoices.filter((i) => studentIds.has(i.studentId));
  const payments = state.payments.filter((p) => studentIds.has(p.studentId));
  const concessions = state.concessions.filter((c) => studentIds.has(c.studentId));
  const reversals = state.reversals.filter((r) => studentIds.has(r.studentId));
  const lifecycleEvents = state.lifecycleEvents.filter((e) => studentIds.has(e.studentId));
  const leaveRequests = state.leaveRequests.filter((l) => teacherIds.has(l.teacherId));
  const announcements = state.announcements.filter((a) => a.schoolId === schoolId);

  return {
    ...state,
    schools: state.schools.filter((s) => s.id === schoolId),
    campuses,
    subjects,
    classes,
    teachers,
    rooms,
    departments,
    sessions,
    exams,
    inquiries,
    feeCategories,
    feeStructure,
    gradeScale,
    timetableConfigs,
    students,
    attendance,
    attendanceCorrections,
    timetable,
    timetableDrafts,
    timetableStatus,
    marks,
    invoices,
    payments,
    concessions,
    reversals,
    lifecycleEvents,
    leaveRequests,
    announcements,
  };
}
