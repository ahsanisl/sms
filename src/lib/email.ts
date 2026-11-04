import "server-only";

/**
 * Outgoing email. Configure with environment variables:
 *
 *   RESEND_API_KEY   — an API key from https://resend.com (free tier is enough for password resets)
 *   EMAIL_FROM       — the sender, e.g. "EduFlow <no-reply@yourschool.com>" (its domain must be verified in Resend)
 *
 * Without RESEND_API_KEY nothing is sent: emails are printed to the server
 * log instead. In a production build only the subject and recipient are
 * logged (reset links are secrets), unless EMAIL_LOG_FULL=true on a test
 * server. Password-reset emails then don't arrive, and staff reset passwords
 * from Users & Roles instead.
 */
export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(email: Email): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production" && process.env.EMAIL_LOG_FULL !== "true") {
      console.error(`Email not sent (RESEND_API_KEY is not set): "${email.subject}" to ${email.to}`);
    } else {
      console.info(`\n--- Email (not sent: RESEND_API_KEY is not set) ---\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n---\n`);
    }
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "EduFlow <onboarding@resend.dev>", to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!response.ok) {
    console.error("Email send failed", response.status, await response.text().catch(() => ""));
    return { delivered: false };
  }
  return { delivered: true };
}

/** Escapes text for safe use inside the HTML emails below. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
