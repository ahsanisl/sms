"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/tenancy";
import { canSwitchCampus, VIEW_CAMPUS_COOKIE } from "@/lib/campus-scope";
import { assertCampusInScope } from "@/services/scope";

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
