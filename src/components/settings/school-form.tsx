"use client";

import { useState } from "react";
import type { School } from "@/lib/types";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export type SchoolFormValues = Omit<School, "id" | "status" | "onboardingComplete"> & {
  /** Only present when creating (no initialValues) — the school's first School Owner account. */
  ownerName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
};

interface SchoolFormProps {
  initialValues?: School;
  onSubmit: (values: SchoolFormValues) => void;
  onCancel?: () => void;
}

export function SchoolForm({ initialValues, onSubmit, onCancel }: SchoolFormProps) {
  const isCreating = !initialValues;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [tagline, setTagline] = useState(initialValues?.tagline ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [logoEmoji, setLogoEmoji] = useState(initialValues?.logoEmoji ?? "🏫");
  const [reportCardFooter, setReportCardFooter] = useState(
    initialValues?.reportCardFooter ?? "This is a computer-generated report card and does not require a signature.",
  );
  const [showSignatureLines, setShowSignatureLines] = useState(initialValues?.showSignatureLines ?? true);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("School name and address are required.");
      return;
    }
    if (isCreating && (!ownerName.trim() || !ownerEmail.trim())) {
      setError("The School Owner's name and email are required to create a school.");
      return;
    }
    if (isCreating && ownerPassword.length < 8) {
      setError("The School Owner's password must be at least 8 characters.");
      return;
    }
    onSubmit({
      name,
      tagline,
      address,
      phone,
      email,
      logoEmoji,
      reportCardFooter,
      showSignatureLines,
      ...(isCreating ? { ownerName, ownerEmail, ownerPassword } : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
        <FormField label="Logo" htmlFor="logoEmoji" hint="An emoji standing in for an uploaded logo.">
          <Input id="logoEmoji" value={logoEmoji} onChange={(e) => setLogoEmoji(e.target.value)} className="w-16 text-center text-xl" maxLength={4} />
        </FormField>
        <FormField label="School Name" htmlFor="name" required error={error && !name.trim() ? error : undefined}>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Horizon International School" />
        </FormField>
      </div>
      <FormField label="Tagline" htmlFor="tagline">
        <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </FormField>
      <FormField label="Address" htmlFor="address" required error={error && !address.trim() ? error : undefined}>
        <Textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 21 3456 7890" />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@school.edu.pk" />
        </FormField>
      </div>
      <FormField label="Report Card Footer Note" htmlFor="reportCardFooter">
        <Textarea id="reportCardFooter" rows={2} value={reportCardFooter} onChange={(e) => setReportCardFooter(e.target.value)} />
      </FormField>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={showSignatureLines} onCheckedChange={(checked) => setShowSignatureLines(!!checked)} />
        <span className="text-body-md text-on-surface">Show Principal / Class Teacher signature lines on result cards</span>
      </label>

      {isCreating && (
        <div className="border-t border-outline-variant/40 pt-4 space-y-4">
          <div>
            <h4 className="text-title-md font-semibold text-on-surface">School Owner Account</h4>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              This creates the school&apos;s first login. They&apos;ll be taken through a setup wizard the first time they sign in.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Owner Name" htmlFor="ownerName" required error={error && !ownerName.trim() ? error : undefined}>
              <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g., Ayesha Malik" />
            </FormField>
            <FormField label="Owner Email" htmlFor="ownerEmail" required error={error && !ownerEmail.trim() ? error : undefined}>
              <Input id="ownerEmail" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@school.edu.pk" />
            </FormField>
          </div>
          <FormField
            label="Owner Password"
            htmlFor="ownerPassword"
            required
            hint="At least 8 characters. Share this with the new owner directly — it won't be shown again."
            error={error && ownerPassword.length < 8 ? error : undefined}
          >
            <Input id="ownerPassword" type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="e.g., Sunrise2026!" />
          </FormField>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{initialValues ? "Save Changes" : "Create School"}</Button>
      </div>
    </form>
  );
}
