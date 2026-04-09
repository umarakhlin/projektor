import { Resend } from "resend";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  return configured && configured.length > 0
    ? configured
    : "Projektor <onboarding@resend.dev>";
}

export async function sendVerificationEmail(
  toEmail: string,
  verificationUrl: string
): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.info(
      `[Email fallback] RESEND_API_KEY missing. Verification link for ${toEmail}: ${verificationUrl}`
    );
    return false;
  }

  await client.emails.send({
    from: getFromAddress(),
    to: toEmail,
    subject: "Verify your email for Projektor",
    html: `
      <p>Welcome to <strong>Projektor</strong>.</p>
      <p>Please verify your email to unlock project creation:</p>
      <p><a href="${verificationUrl}">Verify my email</a></p>
      <p>This link expires in 24 hours.</p>
    `
  });

  return true;
}
