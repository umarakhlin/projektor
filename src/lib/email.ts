/**
 * Transactional email. Prefers Brevo if configured, falls back to
 * Resend. No-op if neither is configured.
 *
 * Env vars:
 *   BREVO_API_KEY       - primary provider
 *   RESEND_API_KEY      - fallback provider
 *   EMAIL_FROM          - either a plain "foo@bar.com" or the
 *                         RFC "Name <foo@bar.com>" form
 *   EMAIL_FROM_NAME     - optional override when EMAIL_FROM is just
 *                         a plain address (useful for Brevo)
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM_RAW = process.env.EMAIL_FROM ?? "Projektor <uma.rakhlin@gmail.com>";
const EMAIL_FROM_NAME_OVERRIDE = process.env.EMAIL_FROM_NAME ?? "Projektor";

type Sender = { name: string; email: string };

function parseSender(raw: string): Sender {
  const match = raw.match(/^\s*(.+?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1].replace(/^"|"$/g, ""), email: match[2] };
  return { name: EMAIL_FROM_NAME_OVERRIDE, email: raw.trim() };
}

export function isEmailConfigured(): boolean {
  return Boolean(BREVO_API_KEY?.trim() || RESEND_API_KEY?.trim());
}

async function sendViaBrevo(
  sender: Sender,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY as string,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Brevo API error:", res.status, err);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e) {
    console.error("Brevo send error:", e);
    return { ok: false, error: String(e) };
  }
}

async function sendViaResend(
  sender: Sender,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `${sender.name} <${sender.email}>`,
        to: [to],
        subject,
        html
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", res.status, err);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e) {
    console.error("Resend send error:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) return { ok: true };

  const sender = parseSender(EMAIL_FROM_RAW);

  if (BREVO_API_KEY?.trim()) {
    return sendViaBrevo(sender, to, subject, html);
  }
  return sendViaResend(sender, to, subject, html);
}
