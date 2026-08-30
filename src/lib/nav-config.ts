import type { Role } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Admissions", href: "/admissions", icon: "how_to_reg" },
  { label: "Students", href: "/students", icon: "group" },
  { label: "Teachers", href: "/teachers", icon: "school" },
  { label: "Classes", href: "/classes", icon: "class" },
  { label: "Attendance", href: "/attendance", icon: "event_available" },
  { label: "Fees", href: "/fees", icon: "payments" },
  { label: "Exams", href: "/exams", icon: "quiz" },
  { label: "Timetable", href: "/timetable", icon: "calendar_month" },
  { label: "Announcements", href: "/announcements", icon: "campaign" },
  { label: "Leave Requests", href: "/leave", icon: "event_busy" },
  { label: "Reports", href: "/reports", icon: "analytics" },
];

/** School Owner sees the same operational nav as School Admin, plus Campuses promoted out of Settings. */
export const OWNER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Campuses", href: "/settings/campuses", icon: "business" },
  { label: "Admissions", href: "/admissions", icon: "how_to_reg" },
  { label: "Students", href: "/students", icon: "group" },
  { label: "Teachers", href: "/teachers", icon: "school" },
  { label: "Classes", href: "/classes", icon: "class" },
  { label: "Attendance", href: "/attendance", icon: "event_available" },
  { label: "Fees", href: "/fees", icon: "payments" },
  { label: "Exams", href: "/exams", icon: "quiz" },
  { label: "Timetable", href: "/timetable", icon: "calendar_month" },
  { label: "Announcements", href: "/announcements", icon: "campaign" },
  { label: "Leave Requests", href: "/leave", icon: "event_busy" },
  { label: "Reports", href: "/reports", icon: "analytics" },
];

export const TEACHER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "My Classes", href: "/classes", icon: "school" },
  { label: "Students", href: "/students", icon: "group" },
  { label: "Attendance", href: "/attendance", icon: "event_available" },
  { label: "Exams", href: "/exams", icon: "quiz" },
  { label: "Timetable", href: "/timetable", icon: "calendar_month" },
  { label: "Announcements", href: "/announcements", icon: "campaign" },
  { label: "Leave", href: "/leave", icon: "event_busy" },
];

/** Parents get their own route tree (/portal/...) rather than sharing admin screens like /fees and /exams. */
export const PARENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "My Children", href: "/students", icon: "face" },
  { label: "Fee Payments", href: "/portal/fees", icon: "payments" },
  { label: "Academics", href: "/portal/exams", icon: "grade" },
  { label: "Events & Calendar", href: "/timetable", icon: "event" },
  { label: "Announcements", href: "/announcements", icon: "forum" },
];

/** Platform-level SaaS operator: manages the roster of schools, never one school's live data — see lib/permissions.ts's platform_admin entry. */
export const PLATFORM_ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Schools", href: "/settings/schools", icon: "corporate_fare" },
];

/** Finance-only nav: no Students/Teachers/Exams management. */
export const ACCOUNTANT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Fees", href: "/fees", icon: "payments" },
  { label: "Fee Structure", href: "/fees/structure", icon: "receipt_long" },
  { label: "Collect Payment", href: "/fees/collect", icon: "point_of_sale" },
  { label: "Fee Reports", href: "/fees/reports", icon: "analytics" },
];

export const FOOTER_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function navForRole(role: Role): NavItem[] {
  switch (role) {
    case "platform_admin":
      return PLATFORM_ADMIN_NAV;
    case "school_owner":
      return OWNER_NAV;
    case "teacher":
      return TEACHER_NAV;
    case "parent":
      return PARENT_NAV;
    case "accountant":
      return ACCOUNTANT_NAV;
    default:
      return ADMIN_NAV;
  }
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
