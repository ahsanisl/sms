import type { Inquiry, InquiryStage } from "@/lib/types";
import { emailFrom, fullName, intBetween, mulberry32, phoneNumber, pick } from "@/lib/mock/names";
import { CAMPUSES, GRADE_ORDER } from "@/lib/mock/reference-data";

export const INQUIRY_STAGE_LABEL: Record<InquiryStage, string> = {
  inquiry: "Inquiry",
  applied: "Applied",
  interview: "Interview",
  offered: "Offered",
  admitted: "Admitted",
  rejected: "Rejected",
};

export const INQUIRY_STAGE_TONE: Record<InquiryStage, "success" | "error" | "warning" | "info" | "neutral"> = {
  inquiry: "neutral",
  applied: "info",
  interview: "info",
  offered: "warning",
  admitted: "success",
  rejected: "error",
};

/** The order a live inquiry normally advances through — used to render "Advance to next stage" actions. */
export const INQUIRY_STAGE_ORDER: InquiryStage[] = ["inquiry", "applied", "interview", "offered", "admitted"];

export const INQUIRY_SOURCES = ["Walk-in", "Referral", "Website", "Phone Call", "Social Media"];

const rand = mulberry32(909);
const TODAY = new Date("2026-08-29T00:00:00");

function daysBefore(n: number): string {
  return new Date(TODAY.getTime() - n * 86400000).toISOString().slice(0, 10);
}

function buildInquiries(): Inquiry[] {
  const inquiries: Inquiry[] = [];
  const stageSpread: InquiryStage[] = ["inquiry", "inquiry", "applied", "applied", "interview", "offered", "admitted", "rejected"];
  let seq = 1;

  for (const stage of stageSpread) {
    const campus = pick(CAMPUSES, rand);
    const grade = pick(GRADE_ORDER, rand);
    const childGender = rand() > 0.5 ? "male" : "female";
    const childName = fullName(childGender, rand);
    const parentGender = rand() > 0.5 ? "male" : "female";
    const parentName = fullName(parentGender, rand);
    const daysAgo = intBetween(1, 45, rand);
    const createdAt = daysBefore(daysAgo);
    const updatedAt = daysBefore(intBetween(0, daysAgo, rand));

    inquiries.push({
      id: `inq${seq++}`,
      childName,
      gradeAppliedFor: grade,
      campusId: campus.id,
      parentName: `${parentGender === "male" ? "Mr." : "Mrs."} ${parentName}`,
      parentPhone: phoneNumber(rand),
      parentEmail: emailFrom(parentName, "gmail.com"),
      stage,
      source: pick(INQUIRY_SOURCES, rand),
      notes: stage === "rejected" ? "No seats available in the requested grade this term." : undefined,
      createdAt,
      updatedAt,
    });
  }
  return inquiries;
}

// Mutable — see the render-body mirror-sync comment in lib/store/app-data-context.tsx.
export let INQUIRIES: Inquiry[] = buildInquiries();

export function syncInquiries(next: Inquiry[]) {
  INQUIRIES = next;
}
