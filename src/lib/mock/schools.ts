import type { School } from "@/lib/types";

/**
 * The two tenants seeded for this demo. Plain constant — no mutable
 * mirror/sync* needed here (unlike CAMPUSES/TEACHERS/etc. in
 * reference-data.ts), since nothing outside a React hook needs a live
 * schoolName()-style lookup today. See lib/store/school-scope.ts for how
 * everything else in the data model gets scoped to one of these.
 */
export const SCHOOLS: School[] = [
  {
    id: "school-eduflow",
    name: "EduFlow Academy",
    tagline: "Excellence in Education Since 2005",
    address: "Shahrah-e-Faisal, Karachi, Pakistan",
    phone: "+92 21 3456 7890",
    email: "info@eduflow.edu.pk",
    logoEmoji: "🎓",
    reportCardFooter: "This is a computer-generated report card and does not require a signature.",
    showSignatureLines: true,
    status: "active",
    onboardingComplete: true,
  },
  {
    id: "school-horizon",
    name: "Horizon International School",
    tagline: "Shaping Global Citizens",
    address: "Gulshan-e-Iqbal, Karachi, Pakistan",
    phone: "+92 21 3457 9900",
    email: "info@horizon.edu.pk",
    logoEmoji: "🌐",
    reportCardFooter: "This is a computer-generated report card and does not require a signature.",
    showSignatureLines: true,
    status: "active",
    onboardingComplete: true,
  },
];
