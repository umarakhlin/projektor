export function getModeratorEmails(): string[] {
  return (process.env.MODERATOR_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isModerator(email: string | null | undefined): boolean {
  if (!email) return false;
  return getModeratorEmails().includes(email.toLowerCase());
}
