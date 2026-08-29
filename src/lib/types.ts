export type Role = "school_owner" | "school_admin" | "campus_admin" | "teacher" | "accountant" | "parent";

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  campusId?: string;
  avatarSeed: string;
  /** Only set for parent-role demo accounts. */
  childStudentIds?: string[];
}

/** School-wide identity used both on the Settings → School Profile form and as the letterhead on printed documents (currently the exam Result Card). */
export interface SchoolProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  /** Emoji/short glyph standing in for a real uploaded logo. */
  logoEmoji: string;
  /** Printed at the bottom of the Result Card. */
  reportCardFooter: string;
  /** Whether the Result Card shows a "Principal" / "Class Teacher" signature line. */
  showSignatureLines: boolean;
}

/** Screen-level modules gated by the route permission map (see lib/permissions.ts). */
export type PermissionModule =
  | "dashboard"
  | "students"
  | "studentsManage"
  | "admissions"
  | "teachers"
  | "classes"
  | "classesManage"
  | "attendance"
  | "attendanceMark"
  | "fees"
  | "feesCollect"
  | "feesStructure"
  | "exams"
  | "examsCreate"
  | "examsMarks"
  | "timetable"
  | "timetableBuilder"
  | "announcements"
  | "announcementsCreate"
  | "leave"
  | "reports"
  | "settings"
  | "settingsUsers"
  | "settingsCampuses"
  | "settingsSubjects";

export type ArchivableStatus = "active" | "archived";

export interface Campus {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status: ArchivableStatus;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  status: ArchivableStatus;
}

export interface Department {
  id: string;
  name: string;
  campusId: string;
  subjectIds: string[];
  /** A teacher at the same campus, ideally one who teaches one of this department's subjects — not enforced, just a convention. */
  headTeacherId?: string;
  status: ArchivableStatus;
}

export interface ClassSection {
  id: string;
  grade: string;
  section: string;
  campusId: string;
  classTeacherId: string;
  subjectIds: string[];
  studentCapacity: number;
  status: ArchivableStatus;
}

export interface AcademicSession {
  id: string;
  label: string; // e.g. "2026-2027"
  startDate: string;
  endDate: string;
  terms: { name: string; startDate: string; endDate: string }[];
  isActive: boolean;
}

/** "withdrawn"/"alumni" are terminal lifecycle states reached only via the Withdraw/Transfer workflow (see StudentLifecycleEvent) — the Edit Student form only offers active/inactive. */
export type StudentStatus = "active" | "inactive" | "withdrawn" | "alumni";

export type StudentLifecycleEventType = "withdrawal" | "transfer" | "reactivation" | "promotion";

export interface StudentLifecycleEvent {
  id: string;
  studentId: string;
  type: StudentLifecycleEventType;
  date: string;
  reason?: string;
  /** For "withdrawal": the terminal status the student was moved to. */
  resultingStatus?: StudentStatus;
  fromClassId?: string;
  toClassId?: string;
  fromCampusId?: string;
  toCampusId?: string;
  leavingCertificateIssued?: boolean;
  recordedBy?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  admissionNo: string;
  classId: string;
  campusId: string;
  gender: "male" | "female";
  dob: string;
  bloodGroup: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  admissionDate: string;
  status: StudentStatus;
}

export type InquiryStage = "inquiry" | "applied" | "interview" | "offered" | "admitted" | "rejected";

export interface Inquiry {
  id: string;
  childName: string;
  gradeAppliedFor: string;
  campusId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  stage: InquiryStage;
  source: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Set once "Admit & Create Student Record" has run — links to the resulting Student. */
  convertedStudentId?: string;
}

export type TeacherStatus = "active" | "inactive";

export interface Teacher {
  id: string;
  name: string;
  employeeId: string;
  campusId: string;
  subjectIds: string[];
  classIds: string[];
  phone: string;
  email: string;
  qualification: string;
  joinDate: string;
  status: TeacherStatus;
}

export type AttendanceStatus = "present" | "absent" | "leave" | "late";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO date, no time
  status: AttendanceStatus;
  markedBy: string;
}

export type CorrectionStatus = "pending" | "approved" | "rejected";

/** A teacher's request to change an already-saved attendance record — approving it edits the underlying AttendanceRecord and leaves this as the audit trail. */
export interface AttendanceCorrectionRequest {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  currentStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export type FeeFrequency = "monthly" | "quarterly" | "annual" | "one_time";

/** A canonical, managed list of fee item names — Fee Structure items pick from these instead of free-typing a name, so a typo can't create a phantom category. */
export interface FeeCategory {
  id: string;
  name: string;
  status: ArchivableStatus;
}

export interface FeeStructureItem {
  id: string;
  campusId: string;
  classId: string;
  name: string;
  amount: number;
  frequency: FeeFrequency;
}

export type InvoiceStatus = "paid" | "unpaid" | "overdue" | "partial";

export interface FeeInvoiceLineItem {
  name: string;
  amount: number;
  /** Discount/concession line items render as a negative deduction on the invoice. */
  isDiscount?: boolean;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  invoiceNo: string;
  month: string; // e.g. "August 2026"
  issueDate: string;
  dueDate: string;
  items: FeeInvoiceLineItem[];
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
}

export type ConcessionType = "sibling_discount" | "staff_discount" | "scholarship" | "financial_aid" | "other";

export interface FeeConcession {
  id: string;
  studentId: string;
  type: ConcessionType;
  label: string;
  /** Exactly one of amount (flat PKR) or percentage (0-100) is set. */
  amount?: number;
  percentage?: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
  status: ArchivableStatus;
}

export interface FeePaymentReversal {
  id: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  reason: string;
  date: string;
  reversedBy: string;
}

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "cheque";

export interface FeePayment {
  id: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  receivedBy: string;
  reference?: string;
}

export type ExamStatus = "scheduled" | "ongoing" | "completed";

export interface Exam {
  id: string;
  name: string;
  term: string;
  campusId: string;
  classIds: string[];
  subjectIds: string[];
  startDate: string;
  endDate: string;
  totalMarks: number;
  passingMarks: number;
  status: ExamStatus;
  /** Whether entered marks are visible to Teachers/Parents on the result card. Admins/teachers can still review unpublished marks while entering them. */
  resultsPublished: boolean;
}

export interface MarksEntry {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  obtainedMarks: number;
  totalMarks: number;
}

/** One letter-grade band — a percentage earns this grade once it's >= minPercentage and no higher band's minPercentage is also met. */
export interface GradeBand {
  id: string;
  grade: string;
  minPercentage: number;
}

export type TimetableDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export interface TimetableSlot {
  id: string;
  classId: string;
  day: TimetableDay;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
}

export interface Room {
  id: string;
  name: string;
  campusId: string;
  type: "classroom" | "lab" | "hall" | "other";
  capacity: number;
  status: ArchivableStatus;
}

export interface Period {
  period: number;
  startTime: string;
  endTime: string;
}

/** Whether a class's timetable has unpublished builder edits sitting on top of the last published version. */
export type TimetableStatus = "draft" | "published";

export type AnnouncementAudience = "all" | "teachers" | "parents" | "students";
export type AnnouncementPriority = "normal" | "important";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  campusId?: string;
  priority: AnnouncementPriority;
  publishedAt: string;
  author: string;
}

export type LeaveType = "sick" | "casual" | "annual" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  teacherId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}
