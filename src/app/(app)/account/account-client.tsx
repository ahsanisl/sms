"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { FormField } from "@/components/shared/form-field";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changeOwnPasswordAction, signOutOtherDevicesAction } from "@/app/(app)/account/actions";
import { formatDateTime, timeAgo } from "@/lib/format";

/** Rough strength hint — the server only enforces the 8-character minimum. */
function strength(password: string): { label: string; tone: string; width: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", tone: "bg-error", width: "w-1/4" };
  if (score <= 3) return { label: "Fair", tone: "bg-warning", width: "w-2/4" };
  if (score === 4) return { label: "Good", tone: "bg-success", width: "w-3/4" };
  return { label: "Strong", tone: "bg-success", width: "w-full" };
}

export interface DeviceRow {
  id: string;
  current: boolean;
  signedInAt: string;
  lastActiveAt: string;
  userAgent: string;
  ipAddress: string;
}

/** "Chrome on Windows", "EduFlow app on Android"… from a user-agent string. */
function describeDevice(userAgent: string): string {
  if (!userAgent) return "Unknown device";
  if (/dart|flutter/i.test(userAgent)) return `EduFlow app${/android/i.test(userAgent) ? " on Android" : /ios|iphone|ipad/i.test(userAgent) ? " on iPhone/iPad" : ""}`;
  const browser = /edg\//i.test(userAgent) ? "Edge" : /chrome\//i.test(userAgent) ? "Chrome" : /firefox\//i.test(userAgent) ? "Firefox" : /safari\//i.test(userAgent) ? "Safari" : "Browser";
  const os = /android/i.test(userAgent) ? "Android" : /iphone|ipad|ios/i.test(userAgent) ? "iPhone/iPad" : /windows/i.test(userAgent) ? "Windows" : /mac os/i.test(userAgent) ? "Mac" : /linux/i.test(userAgent) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function AccountClient({ name, email, roleName, campusName, mustChangePassword, devices }: { name: string; email: string; roleName: string; campusName: string | null; mustChangePassword: boolean; devices: DeviceRow[] }) {
  const [signingOut, setSigningOut] = useState(false);
  const otherDevices = devices.filter((d) => !d.current).length;

  async function signOutOthers() {
    setSigningOut(true);
    const result = await signOutOtherDevicesAction();
    setSigningOut(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.count ? `Signed out of ${result.count} other device${result.count === 1 ? "" : "s"}.` : "No other devices were signed in.");
    window.location.reload();
  }
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const meter = strength(newPassword);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8 || mismatch) return;
    setSaving(true);
    setError(null);
    const result = await changeOwnPasswordAction({ currentPassword, newPassword });
    if (!result.success) {
      setSaving(false);
      setError(result.error ?? "Couldn't change your password.");
      return;
    }
    toast.success("Password changed.");
    // Full reload rather than a client navigation: the shell caches this account's
    // permissions (including the must-change flag) for the session, so start fresh.
    window.location.assign(mustChangePassword ? "/dashboard" : "/account");
  }

  return (
    <div className="max-w-[48rem]">
      <PageHeader title="My Account" description="Your profile and sign-in details." />

      {mustChangePassword && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-container/70 p-4 text-on-warning-container">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Choose your own password to continue</p>
            <p className="text-body-md">You signed in with a temporary password set by your school. Pick a new one that only you know — you&apos;ll need it from now on.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4 p-lg">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-title-lg font-semibold text-on-surface">{name}</p>
              <p className="truncate text-body-md text-on-surface-variant">{email}</p>
              <p className="mt-1 text-label-md text-on-surface-variant">
                {roleName}
                {campusName ? ` · ${campusName}` : ""}
              </p>
            </div>
          </div>
          <p className="border-t border-outline-variant/50 px-lg py-3 text-label-md text-on-surface-variant">To change your name, email or role, ask your school&apos;s Owner or Admin.</p>
        </Card>

        <Card>
          <CardHeader
            icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-fixed text-secondary"><KeyRound className="h-4 w-4" aria-hidden /></span>}
            title="Change Password"
            description="Use at least 8 characters. A longer password with a mix of letters, numbers and symbols is safer."
          />
          <form onSubmit={submit} className="space-y-4 p-lg pt-md" noValidate>
            <FormField label={mustChangePassword ? "Temporary Password" : "Current Password"} htmlFor="currentPassword" required>
              <Input id="currentPassword" type={show ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" autoFocus={mustChangePassword} />
            </FormField>
            <FormField label="New Password" htmlFor="newPassword" required error={tooShort ? "At least 8 characters." : undefined}>
              <div className="relative">
                <Input id="newPassword" type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className="pr-10" aria-describedby="password-strength" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide passwords" : "Show passwords"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div id="password-strength" className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                    <div className={`h-full rounded-full ${meter.tone} ${meter.width}`} />
                  </div>
                  <span className="text-label-sm text-on-surface-variant">{meter.label}</span>
                </div>
              )}
            </FormField>
            <FormField label="Confirm New Password" htmlFor="confirmPassword" required error={mismatch ? "Passwords don't match." : undefined}>
              <Input id="confirmPassword" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={mismatch || undefined} />
            </FormField>
            {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !currentPassword || newPassword.length < 8 || confirm !== newPassword}>
                {saving && <Loader2 className="motion-safe:animate-spin" />}
                {saving ? "Saving…" : "Change Password"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-fixed text-secondary"><MonitorSmartphone className="h-4 w-4" aria-hidden /></span>}
            title="Signed-in Devices"
            description="Browsers and phones where you're signed in. Changing your password signs out all the others."
            action={
              otherDevices > 0 ? (
                <Button size="sm" variant="secondary" onClick={signOutOthers} disabled={signingOut}>
                  {signingOut ? "Signing out…" : "Sign Out Other Devices"}
                </Button>
              ) : undefined
            }
          />
          <ul className="divide-y divide-outline-variant/40 p-lg pt-md">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-on-surface">
                    {describeDevice(d.userAgent)}
                    {d.current && <span className="ml-2 rounded-full bg-success-container px-2 py-0.5 text-label-sm font-semibold text-on-success-container">This device</span>}
                  </p>
                  <p className="text-label-sm text-on-surface-variant" title={`Signed in ${formatDateTime(d.signedInAt)}`}>
                    Active {timeAgo(d.lastActiveAt)}
                    {d.ipAddress ? ` · ${d.ipAddress}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
