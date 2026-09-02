import * as admissionService from "@/services/admission.service";
import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { InquiryDetailClient } from "@/app/(app)/admissions/[id]/inquiry-detail-client";
import type { Student } from "@/lib/types";

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let inquiry;
  try {
    inquiry = await admissionService.getInquiry(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="how_to_reg" title="Inquiry not found" description="It may have been removed, or you don't have access to it." />
          <Link href="/admissions" className="text-label-md text-secondary hover:underline">
            Back to Admissions
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [campuses, classes] = await Promise.all([campusService.listCampuses(session), classService.listClasses(session)]);
  const campus = campuses.find((c) => c.id === inquiry.campusId);
  const activeClasses = classes.filter((c) => c.status === "active");

  const matchingClass = activeClasses.find((c) => c.campusId === inquiry.campusId && c.grade === inquiry.gradeAppliedFor);
  const fallbackClass = activeClasses.find((c) => c.campusId === inquiry.campusId) ?? activeClasses[0];

  const studentSeed: Student = {
    id: "temp",
    name: inquiry.childName,
    rollNumber: "",
    admissionNo: "",
    classId: matchingClass?.id ?? fallbackClass?.id ?? "",
    campusId: inquiry.campusId,
    gender: "male",
    dob: "",
    bloodGroup: "O+",
    parentName: inquiry.parentName,
    parentPhone: inquiry.parentPhone,
    parentEmail: inquiry.parentEmail,
    address: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };

  return (
    <InquiryDetailClient
      inquiryId={inquiry.id}
      childName={inquiry.childName}
      gradeAppliedFor={inquiry.gradeAppliedFor}
      campusName={campus?.name ?? "—"}
      parentName={inquiry.parentName}
      parentPhone={inquiry.parentPhone}
      parentEmail={inquiry.parentEmail}
      source={inquiry.source}
      notes={inquiry.notes}
      createdAt={inquiry.createdAt.toISOString().slice(0, 10)}
      updatedAt={inquiry.updatedAt.toISOString().slice(0, 10)}
      stage={inquiry.stage}
      studentSeed={studentSeed}
      campuses={campuses.filter((c) => c.status === "active")}
      classes={activeClasses}
    />
  );
}
