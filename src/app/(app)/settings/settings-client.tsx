"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GRADE_ORDER } from "@/lib/mock/reference-data";
import { updateSchoolProfileAction } from "@/app/(app)/settings/actions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "School Profile", module: null },
  { label: "Campuses", module: "settingsCampuses" as const },
  { label: "Academic Sessions", module: null },
  { label: "Classes & Subjects", module: null },
  { label: "Timetable & Rooms", module: "timetableBuilder" as const },
  { label: "Fee Settings", module: "feesStructure" as const },
  { label: "Notification Settings", module: null },
  { label: "Users & Roles", module: "settingsUsers" as const },
] as const;

type SectionLabel = (typeof SECTIONS)[number]["label"];
type VisibilityModule = "settingsCampuses" | "timetableBuilder" | "feesStructure" | "settingsUsers";

interface SchoolProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logoEmoji: string;
  reportCardFooter: string;
  showSignatureLines: boolean;
}

interface SettingsClientProps {
  school: SchoolProfile;
  visibility: Record<VisibilityModule, boolean>;
  activeCampuses: { id: string; name: string }[];
  currentSession?: { label: string; startDate: string; endDate: string };
  activeSubjects: { id: string; name: string }[];
  gradeBands: { grade: string; minPercentage: number }[];
  activeDepartmentCount: number;
}

export function SettingsClient({ school, visibility, activeCampuses, currentSession, activeSubjects, gradeBands, activeDepartmentCount }: SettingsClientProps) {
  const router = useRouter();
  const [section, setSection] = useState<SectionLabel>("School Profile");
  const [schoolName, setSchoolName] = useState(school.name);
  const [tagline, setTagline] = useState(school.tagline);
  const [address, setAddress] = useState(school.address);
  const [phone, setPhone] = useState(school.phone);
  const [email, setEmail] = useState(school.email);
  const [logoEmoji, setLogoEmoji] = useState(school.logoEmoji);
  const [reportCardFooter, setReportCardFooter] = useState(school.reportCardFooter);
  const [showSignatureLines, setShowSignatureLines] = useState(school.showSignatureLines);
  const [saving, setSaving] = useState(false);
  // Purely cosmetic in the mock too — never persisted anywhere there either, so there's nothing real to wire up.
  const [notifications, setNotifications] = useState({ email: true, sms: false, feeReminders: true, attendanceAlerts: true });

  const visibleSections = SECTIONS.filter((s) => !s.module || visibility[s.module]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateSchoolProfileAction({ name: schoolName, tagline, address, phone, email, logoEmoji, reportCardFooter, showSignatureLines });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("School profile updated — this appears on the Result Card letterhead everywhere.");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your school's configuration and preferences." />

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="w-full md:w-64 shrink-0">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-2 px-3">Configuration</p>
          <ul className="flex flex-col gap-1">
            {visibleSections.map((s) => (
              <li key={s.label}>
                <button
                  onClick={() => setSection(s.label)}
                  className={cn(
                    "block w-full text-left px-md py-2 rounded-md text-label-md border-l-2 transition-colors",
                    section === s.label
                      ? "bg-surface-container text-primary border-primary font-semibold"
                      : "text-on-surface-variant border-transparent hover:bg-surface-container-low hover:text-primary",
                  )}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 max-w-3xl">
          {section === "School Profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
                <h3 className="text-title-lg font-semibold text-on-surface mb-2">General Information</h3>
                <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
                  <FormField label="Logo" htmlFor="logoEmoji" hint="An emoji standing in for an uploaded logo.">
                    <Input id="logoEmoji" value={logoEmoji} onChange={(e) => setLogoEmoji(e.target.value)} className="w-16 text-center text-xl" maxLength={4} />
                  </FormField>
                  <FormField label="School Name" htmlFor="schoolName">
                    <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Tagline" htmlFor="tagline">
                  <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
                </FormField>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
                <h3 className="text-title-lg font-semibold text-on-surface mb-2">Contact &amp; Location</h3>
                <FormField label="Address" htmlFor="address">
                  <Textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                </FormField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Phone" htmlFor="phone">
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </FormField>
                  <FormField label="Email" htmlFor="email">
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </FormField>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
                <h3 className="text-title-lg font-semibold text-on-surface mb-2">Report Card Branding</h3>
                <p className="text-label-sm text-on-surface-variant -mt-2">Everything above (logo, name, tagline, address) prints as the letterhead on the Result Card — these two just add to it.</p>
                <FormField label="Footer Note" htmlFor="reportCardFooter">
                  <Textarea id="reportCardFooter" rows={2} value={reportCardFooter} onChange={(e) => setReportCardFooter(e.target.value)} />
                </FormField>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showSignatureLines} onCheckedChange={(checked) => setShowSignatureLines(!!checked)} />
                  <span className="text-body-md text-on-surface">Show Principal / Class Teacher signature lines</span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </form>
          )}

          {section === "Campuses" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <p className="text-body-md text-on-surface-variant mb-4">
                {activeCampuses.length} active campus{activeCampuses.length === 1 ? "" : "es"}: {activeCampuses.map((c) => c.name).join(", ")}
              </p>
              <Button asChild>
                <Link href="/settings/campuses">Open Campus Management</Link>
              </Button>
            </div>
          )}

          {section === "Academic Sessions" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              {currentSession ? (
                <>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Current Session</p>
                  <p className="text-headline-sm font-semibold text-primary">{currentSession.label}</p>
                  <p className="text-body-md text-on-surface-variant mt-2">
                    {formatDate(currentSession.startDate)} – {formatDate(currentSession.endDate)}
                  </p>
                </>
              ) : (
                <p className="text-body-md text-on-surface-variant mb-4">No academic session configured yet.</p>
              )}
              <Button asChild className="mt-4">
                <Link href="/settings/sessions">Manage Sessions</Link>
              </Button>
            </div>
          )}

          {section === "Classes & Subjects" && (
            <div className="space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Grades Offered</h3>
                  <Link href="/classes" className="text-label-md text-secondary hover:underline">Manage Classes →</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GRADE_ORDER.map((g) => (
                    <span key={g} className="px-3 py-1 rounded-full bg-surface-container text-label-md text-on-surface">{g}</span>
                  ))}
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Subjects</h3>
                  <Link href="/settings/subjects" className="text-label-md text-secondary hover:underline">Manage Subjects →</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSubjects.map((s) => (
                    <span key={s.id} className="px-3 py-1 rounded-full bg-surface-container text-label-md text-on-surface">{s.name}</span>
                  ))}
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Grade Scale</h3>
                  <Link href="/settings/grade-scale" className="text-label-md text-secondary hover:underline">Manage Grade Scale →</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gradeBands.map((b) => (
                    <span key={b.grade} className="px-3 py-1 rounded-full bg-surface-container text-label-md text-on-surface">{b.grade}: {b.minPercentage}%+</span>
                  ))}
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Departments</h3>
                  <Link href="/settings/departments" className="text-label-md text-secondary hover:underline">Manage Departments →</Link>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  {activeDepartmentCount} active department{activeDepartmentCount === 1 ? "" : "s"} grouping subjects and teaching staff under a head of department.
                </p>
              </div>
            </div>
          )}

          {section === "Timetable & Rooms" && (
            <div className="space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Working Days &amp; Periods</h3>
                  <Link href="/settings/timetable" className="text-label-md text-secondary hover:underline">Configure →</Link>
                </div>
                <p className="text-body-md text-on-surface-variant">Set which days the school teaches and the daily period schedule used by the Timetable Builder.</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Rooms</h3>
                  <Link href="/settings/rooms" className="text-label-md text-secondary hover:underline">Manage Rooms →</Link>
                </div>
                <p className="text-body-md text-on-surface-variant">Classrooms, labs and halls available for room assignment and conflict checks.</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Timetable Builder</h3>
                  <Link href="/timetable" className="text-label-md text-secondary hover:underline">Open Timetable →</Link>
                </div>
                <p className="text-body-md text-on-surface-variant">Build and publish each class&apos;s weekly schedule from the Timetable screen.</p>
              </div>
            </div>
          )}

          {section === "Fee Settings" && (
            <div className="space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <p className="text-body-md text-on-surface-variant mb-4">Configure tuition and other fee items per grade and campus.</p>
                <Button asChild>
                  <Link href="/fees/structure">Open Fee Structure</Link>
                </Button>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-title-lg font-semibold text-on-surface">Fee Categories</h3>
                  <Link href="/settings/fee-categories" className="text-label-md text-secondary hover:underline">Manage Categories →</Link>
                </div>
                <p className="text-body-md text-on-surface-variant">The canonical list of fee item names — e.g. Tuition Fee, Transport Fee — used when adding a Fee Structure item.</p>
              </div>
            </div>
          )}

          {section === "Notification Settings" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-4">
              {[
                { key: "email" as const, label: "Email Notifications", description: "Receive updates via email" },
                { key: "sms" as const, label: "SMS Notifications", description: "Receive updates via SMS" },
                { key: "feeReminders" as const, label: "Fee Reminders", description: "Notify parents before due dates" },
                { key: "attendanceAlerts" as const, label: "Attendance Alerts", description: "Notify on low attendance" },
              ].map((n) => (
                <label key={n.key} className="flex items-center justify-between py-2 border-b border-outline-variant/30 last:border-0 cursor-pointer">
                  <span>
                    <span className="block text-body-md text-on-surface">{n.label}</span>
                    <span className="block text-label-sm text-on-surface-variant">{n.description}</span>
                  </span>
                  <Checkbox
                    checked={notifications[n.key]}
                    onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [n.key]: !!checked }))}
                  />
                </label>
              ))}
            </div>
          )}

          {section === "Users & Roles" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <p className="text-body-md text-on-surface-variant mb-4">Manage staff accounts, roles and page-level access.</p>
              <Button asChild>
                <Link href="/settings/users">Open Users &amp; Roles</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
