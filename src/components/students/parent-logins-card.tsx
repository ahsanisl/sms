"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Link2, Loader2, Unlink, UserPlus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { createParentAccountAction, linkParentAccountAction, unlinkParentAccountAction } from "@/app/(app)/students/[id]/actions";

export interface ParentLogin {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (b) => chars[b % chars.length]).join("");
}

/**
 * Parent portal logins linked to this student — create one (prefilled from
 * the student's parent details), link an existing parent account (siblings
 * share one login), or unlink. Shown only to School Owners / School Admins;
 * the server enforces the same rule.
 */
export function ParentLoginsCard({ studentId, studentName, parentName, parentEmail, logins }: { studentId: string; studentName: string; parentName: string; parentEmail: string; logins: ParentLogin[] }) {
  const [mode, setMode] = useState<"create" | "link" | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<ParentLogin | null>(null);

  return (
    <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-lg card-shadow md:col-span-2">
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-outline-variant pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-title-lg font-semibold text-on-surface">
            <KeyRound size={18} className="text-secondary" aria-hidden /> Parent Portal Logins
          </h3>
          <p className="mt-0.5 text-label-md text-on-surface-variant">Parents sign in to see {studentName.split(" ")[0]}&apos;s attendance, fees, results and homework.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMode("link")}>
            <Link2 /> Link Existing
          </Button>
          <Button size="sm" onClick={() => setMode("create")}>
            <UserPlus /> Create Login
          </Button>
        </div>
      </div>

      {logins.length === 0 ? (
        <p className="py-3 text-body-md text-on-surface-variant">No parent login yet. Create one, or link an existing parent account if a sibling is already enrolled.</p>
      ) : (
        <ul className="divide-y divide-outline-variant/30">
          {logins.map((login) => (
            <li key={login.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={login.name} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-body-md font-medium text-on-surface">
                    {login.name}
                    {login.mustChangePassword && <StatusBadge label="Hasn't signed in yet" tone="warning" />}
                  </p>
                  <p className="truncate text-label-md text-on-surface-variant">{login.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="self-start text-error hover:bg-error-container/40 hover:text-error sm:self-auto" onClick={() => setUnlinkTarget(login)}>
                <Unlink /> Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-label-sm text-on-surface-variant">To reset a parent&apos;s password, use Settings → Users &amp; Roles.</p>

      {mode === "create" && <CreateLoginDialog studentId={studentId} defaultName={parentName} defaultEmail={parentEmail} onClose={() => setMode(null)} />}
      {mode === "link" && <LinkLoginDialog studentId={studentId} studentName={studentName} onClose={() => setMode(null)} />}
      <ConfirmDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => !open && setUnlinkTarget(null)}
        title={`Unlink ${unlinkTarget?.name}?`}
        description={`They'll no longer see ${studentName} in the parent portal. Their login stays active for any other children, and can be linked again later.`}
        confirmLabel="Unlink"
        onConfirm={async () => {
          const target = unlinkTarget;
          if (!target) return;
          const result = await unlinkParentAccountAction(studentId, target.id);
          if (result.success) toast.success(`${target.name} unlinked.`);
          else toast.error(result.error);
        }}
      />
    </div>
  );
}

function CreateLoginDialog({ studentId, defaultName, defaultEmail, onClose }: { studentId: string; defaultName: string; defaultEmail: string; onClose: () => void }) {
  const [name, setName] = useState(defaultName.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, ""));
  const [email, setEmail] = useState(defaultEmail);
  const [password] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createParentAccountAction(studentId, { name, email, password });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't create the login.");
      return;
    }
    setCreated(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy — select the details and copy them manually.");
    }
  }

  return (
    <Modal open onOpenChange={(open) => !open && !saving && onClose()} title={created ? "Parent login created" : "Create Parent Login"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">Share these sign-in details with the parent. They&apos;ll choose their own password when they first sign in. The password won&apos;t be shown again.</p>
          <div className="space-y-1 rounded-lg border border-outline-variant bg-surface-container-low p-3 font-mono text-body-md">
            <p className="break-all">Email: <span className="select-all font-semibold text-primary">{email}</span></p>
            <p className="break-all">Password: <span className="select-all font-semibold tracking-wider text-primary">{password}</span></p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy Details"}</Button>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Parent Name" htmlFor="parentLoginName" required>
            <Input id="parentLoginName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Email" htmlFor="parentLoginEmail" required hint="The parent signs in with this.">
            <Input id="parentLoginEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </FormField>
          <p className="text-label-md text-on-surface-variant">A temporary password is generated for you and shown after the login is created.</p>
          {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim() || !email.trim()}>
              {saving && <Loader2 className="motion-safe:animate-spin" />}
              {saving ? "Creating…" : "Create Login"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Modal>
  );
}

function LinkLoginDialog({ studentId, studentName, onClose }: { studentId: string; studentName: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await linkParentAccountAction(studentId, { email });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't link the account.");
      return;
    }
    toast.success(`Linked — they'll now see ${studentName} in the parent portal.`);
    onClose();
  }

  return (
    <Modal open onOpenChange={(open) => !open && !saving && onClose()} title="Link Existing Parent Login" description="For siblings: one parent login can cover all their children.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Parent's Login Email" htmlFor="linkParentEmail" required>
          <Input id="linkParentEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="parent@example.com" />
        </FormField>
        {error && <p role="alert" className="rounded-lg bg-error-container/60 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || !email.trim()}>{saving ? "Linking…" : "Link Account"}</Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}
