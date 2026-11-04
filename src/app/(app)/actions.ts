"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/tenancy";
import { canSwitchCampus, VIEW_CAMPUS_COOKIE } from "@/lib/campus-scope";
import { assertCampusInScope } from "@/services/scope";
import { can } from "@/lib/authorization";
import * as studentService from "@/services/student.service";
import * as teacherService from "@/services/teacher.service";
import * as classService from "@/services/class.service";
import * as admissionService from "@/services/admission.service";
import { buildNotificationItems } from "@/app/(app)/notifications/build-items";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Backs the top bar campus switcher — `null` means "All Campuses". Only the overview lists that opt in (ListScope's inView) read this back; see services/scope.ts. */
export async function setViewCampusAction(campusId: string | null): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (!canSwitchCampus(session.role)) return { success: false, error: "Your role can't switch campuses." };
    const cookieStore = await cookies();
    if (campusId) {
      await assertCampusInScope(session, campusId);
      cookieStore.set(VIEW_CAMPUS_COOKIE, campusId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      cookieStore.delete(VIEW_CAMPUS_COOKIE);
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export interface SearchResult {
  id: string;
  kind: "student" | "teacher" | "class" | "inquiry";
  title: string;
  subtitle: string;
  href: string;
}

const SEARCH_LIMIT_PER_KIND = 5;

/**
 * Backs the top bar / Ctrl+K command palette's record search. Each kind is
 * only searched when the caller's role can already open that list elsewhere
 * (the same `can()` checks the pages use), and every read goes through the
 * normal campus-scoped services — so search never reveals more than the rest
 * of the app does. A parent only ever matches their own children.
 */
export async function globalSearchAction(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];
  try {
    const session = await requireSession();
    if (!session.schoolId) return [];
    const matches = (...values: (string | undefined | null)[]) => values.some((v) => v?.toLowerCase().includes(query));

    const [canStudents, canTeachers, canClasses, canAdmissions] = await Promise.all([
      can(session, "students"),
      can(session, "teachers"),
      can(session, "classes"),
      can(session, "admissions"),
    ]);
    const isParent = session.role === "parent";

    const [students, teachers, classes, inquiries] = await Promise.all([
      isParent || canStudents ? studentService.listStudents(session) : Promise.resolve([]),
      canTeachers && !isParent ? teacherService.listTeachers(session) : Promise.resolve([]),
      canClasses && !isParent ? classService.listClasses(session) : Promise.resolve([]),
      canAdmissions && !isParent ? admissionService.listInquiries(session) : Promise.resolve([]),
    ]);
    const classLabel = (classId: string) => {
      const cls = classes.find((c) => c.id === classId);
      return cls ? `Class ${cls.grade}-${cls.section}` : null;
    };

    const results: SearchResult[] = [];
    students
      .filter((s) => matches(s.name, s.rollNumber, s.admissionNo, s.parentName, s.parentPhone))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .forEach((s) =>
        results.push({
          id: s.id,
          kind: "student",
          title: s.name,
          subtitle: [classLabel(s.classId), `Adm. ${s.admissionNo}`, s.status !== "active" ? s.status : null].filter(Boolean).join(" · "),
          href: `/students/${s.id}`,
        }),
      );
    teachers
      .filter((t) => matches(t.name, t.employeeId, t.email, t.phone))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .forEach((t) => results.push({ id: t.id, kind: "teacher", title: t.name, subtitle: [t.employeeId, t.qualification].filter(Boolean).join(" · "), href: `/teachers/${t.id}` }));
    classes
      .filter((c) => c.status === "active" && matches(`${c.grade}-${c.section}`, `${c.grade} ${c.section}`, `class ${c.grade}`))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .forEach((c) => results.push({ id: c.id, kind: "class", title: `Class ${c.grade}-${c.section}`, subtitle: `Capacity ${c.studentCapacity}`, href: `/classes/${c.id}` }));
    inquiries
      .filter((i) => matches(i.childName, i.parentName, i.parentPhone, i.parentEmail))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .forEach((i) => results.push({ id: i.id, kind: "inquiry", title: i.childName, subtitle: `Admission inquiry · ${i.gradeAppliedFor} · ${i.stage}`, href: `/admissions/${i.id}` }));
    return results;
  } catch {
    return [];
  }
}

/**
 * The bell's ids, remembered for a few minutes per user and campus view, so
 * several open tabs (or quick page reloads) don't each rebuild every
 * notification. The Notifications page itself always builds fresh. Lives in
 * this server's memory: each server process keeps its own, which is fine —
 * it only saves work.
 */
const BELL_CACHE_MS = 4 * 60 * 1000;
const bellCache = new Map<string, { at: number; ids: string[] }>();

/** Ids of the viewer's current derived notifications — backs the top bar's unread badge (read state itself is kept per browser; see lib/notification-read-state.ts). */
export async function notificationIdsAction(): Promise<string[]> {
  try {
    const session = await requireSession();
    if (!session.schoolId) return [];
    const key = `${session.userId}:${(await cookies()).get(VIEW_CAMPUS_COOKIE)?.value ?? "all"}`;
    const cached = bellCache.get(key);
    if (cached && Date.now() - cached.at < BELL_CACHE_MS) return cached.ids;
    const ids = (await buildNotificationItems(session)).map((i) => i.id);
    bellCache.set(key, { at: Date.now(), ids });
    if (bellCache.size > 5000) for (const [k, v] of bellCache) if (Date.now() - v.at >= BELL_CACHE_MS) bellCache.delete(k);
    return ids;
  } catch {
    return [];
  }
}
