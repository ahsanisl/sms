import type { Role } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Extra search terms for the command palette (components/layout/command-palette.tsx). */
  keywords?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Staff nav (School Owner / School Admin / Campus Admin). Every item is still
 * filtered by the live, DB-backed permission matrix in the sidebar — e.g.
 * Campuses only shows for roles holding `settingsCampuses`, Settings only for
 * roles holding `settings` — so one shared tree serves all three roles.
 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard", keywords: ["home"] }] },
  {
    id: "school",
    label: "School Management",
    items: [
      { label: "Campuses", href: "/settings/campuses", icon: "business", keywords: ["branches"] },
      { label: "Admissions", href: "/admissions", icon: "how_to_reg", keywords: ["inquiries", "enrol", "applications"] },
      { label: "Students", href: "/students", icon: "group", keywords: ["pupils", "learners"] },
      { label: "Teachers", href: "/teachers", icon: "school", keywords: ["staff", "faculty"] },
    ],
  },
  {
    id: "operations",
    label: "Daily Operations",
    items: [
      { label: "Attendance", href: "/attendance", icon: "event_available", keywords: ["present", "absent", "mark"] },
      { label: "Timetable", href: "/timetable", icon: "calendar_month", keywords: ["schedule", "periods"] },
      { label: "Leave Requests", href: "/leave", icon: "event_busy", keywords: ["absence", "time off"] },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    items: [
      { label: "Classes", href: "/classes", icon: "class", keywords: ["sections", "grades"] },
      { label: "Syllabus", href: "/syllabus", icon: "menu_book", keywords: ["curriculum", "topics"] },
      { label: "Classwork", href: "/classwork", icon: "edit_note" },
      { label: "Homework", href: "/homework", icon: "assignment", keywords: ["assignments"] },
      { label: "Exams", href: "/exams", icon: "quiz", keywords: ["results", "marks", "tests"] },
    ],
  },
  { id: "finance", label: "Finance", items: [{ label: "Fees", href: "/fees", icon: "payments", keywords: ["invoices", "payments", "dues"] }] },
  { id: "communication", label: "Communication", items: [{ label: "Announcements", href: "/announcements", icon: "campaign", keywords: ["notices", "news"] }] },
  {
    id: "insights",
    label: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: "analytics", keywords: ["analytics", "export"] },
      { label: "Audit Log", href: "/audit-log", icon: "history", keywords: ["activity", "history", "changes", "who changed"] },
    ],
  },
  { id: "admin", label: "Administration", items: [{ label: "Settings", href: "/settings", icon: "settings", keywords: ["configuration", "users", "roles"] }] },
];

export const TEACHER_NAV_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard", keywords: ["home"] }] },
  {
    id: "operations",
    label: "Daily Operations",
    items: [
      { label: "Attendance", href: "/attendance", icon: "event_available", keywords: ["present", "absent", "mark"] },
      { label: "Timetable", href: "/timetable", icon: "calendar_month", keywords: ["schedule", "periods"] },
      { label: "My Leave", href: "/leave", icon: "event_busy", keywords: ["absence", "time off"] },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    items: [
      { label: "My Classes", href: "/classes", icon: "class", keywords: ["sections"] },
      { label: "Students", href: "/students", icon: "group", keywords: ["pupils"] },
      { label: "Syllabus", href: "/syllabus", icon: "menu_book", keywords: ["curriculum", "topics"] },
      { label: "Classwork", href: "/classwork", icon: "edit_note" },
      { label: "Homework", href: "/homework", icon: "assignment", keywords: ["assignments", "grading"] },
      { label: "Exams", href: "/exams", icon: "quiz", keywords: ["results", "marks"] },
    ],
  },
  { id: "communication", label: "Communication", items: [{ label: "Announcements", href: "/announcements", icon: "campaign", keywords: ["notices"] }] },
];

/** Parents get their own route tree (/portal/...) rather than sharing admin screens like /fees and /exams. */
export const PARENT_NAV_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard", keywords: ["home"] }] },
  {
    id: "family",
    label: "My Family",
    items: [
      { label: "My Children", href: "/students", icon: "face", keywords: ["kids", "profile"] },
      { label: "Fee Payments", href: "/portal/fees", icon: "payments", keywords: ["invoices", "dues"] },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    items: [
      { label: "Results", href: "/portal/exams", icon: "grade", keywords: ["exams", "marks", "report card"] },
      { label: "Syllabus", href: "/portal/syllabus", icon: "menu_book" },
      { label: "Classwork", href: "/portal/classwork", icon: "edit_note" },
      { label: "Homework", href: "/portal/homework", icon: "assignment", keywords: ["assignments"] },
      { label: "Timetable", href: "/timetable", icon: "event", keywords: ["schedule", "calendar"] },
    ],
  },
  { id: "communication", label: "Communication", items: [{ label: "Announcements", href: "/announcements", icon: "forum", keywords: ["notices"] }] },
];

/** Platform-level SaaS operator: manages the roster of schools, never one school's live data — see lib/permissions.ts's platform_admin entry. */
export const PLATFORM_ADMIN_NAV_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard", keywords: ["home"] }] },
  { id: "admin", label: "Administration", items: [{ label: "Schools", href: "/settings/schools", icon: "corporate_fare", keywords: ["tenants"] }] },
];

/** Finance-only nav: no Students/Teachers/Exams management. */
export const ACCOUNTANT_NAV_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard", keywords: ["home"] }] },
  {
    id: "finance",
    label: "Finance",
    items: [
      { label: "Fees Overview", href: "/fees", icon: "payments", keywords: ["invoices", "dues"] },
      { label: "Collect Payment", href: "/fees/collect", icon: "point_of_sale", keywords: ["receive", "pay"] },
      { label: "Fee Structure", href: "/fees/structure", icon: "receipt_long" },
      { label: "Fee Reports", href: "/fees/reports", icon: "analytics", keywords: ["defaulters", "collection"] },
    ],
  },
  { id: "communication", label: "Communication", items: [{ label: "Announcements", href: "/announcements", icon: "campaign", keywords: ["notices"] }] },
];

/**
 * Shortcuts into the most common create/record workflows. Shown on the
 * dashboard and in the command palette, each filtered by the permission
 * module its route belongs to (lib/permissions.ts's moduleForPath) — so a
 * role only ever sees the actions it can actually complete.
 */
export const QUICK_ACTIONS: NavItem[] = [
  { label: "Mark Attendance", href: "/attendance/mark", icon: "how_to_reg", keywords: ["register", "roll call"] },
  { label: "Add Student", href: "/students/new", icon: "person_add", keywords: ["enrol", "new student"] },
  { label: "New Admission Inquiry", href: "/admissions/new", icon: "how_to_reg", keywords: ["lead", "applicant"] },
  { label: "Collect Fee", href: "/fees/collect", icon: "point_of_sale", keywords: ["payment", "receive"] },
  { label: "Post Homework", href: "/homework/new", icon: "assignment", keywords: ["assignment"] },
  { label: "Create Exam", href: "/exams/create", icon: "quiz", keywords: ["test", "schedule exam"] },
  { label: "Enter Marks", href: "/exams/marks", icon: "edit_note", keywords: ["grades", "results"] },
  { label: "New Announcement", href: "/announcements/create", icon: "campaign", keywords: ["notice", "broadcast"] },
];

export function navGroupsForRole(role: Role): NavGroup[] {
  switch (role) {
    case "platform_admin":
      return PLATFORM_ADMIN_NAV_GROUPS;
    case "teacher":
      return TEACHER_NAV_GROUPS;
    case "parent":
      return PARENT_NAV_GROUPS;
    case "accountant":
      return ACCOUNTANT_NAV_GROUPS;
    default:
      return ADMIN_NAV_GROUPS;
  }
}

/**
 * The single nav item a pathname belongs to — the longest matching href, so
 * e.g. /fees/structure highlights "Fee Structure" rather than also lighting up
 * the shorter "Fees Overview" (/fees) entry.
 */
export function activeNavHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    if ((pathname === item.href || pathname.startsWith(`${item.href}/`)) && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "Platform Admin",
  school_owner: "School Owner",
  school_admin: "School Admin",
  campus_admin: "Campus Admin",
  teacher: "Teacher",
  accountant: "Accountant",
  parent: "Parent",
};
