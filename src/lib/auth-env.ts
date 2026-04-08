export function validateAuthEnv(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Missing required NEXTAUTH_SECRET. Set a strong secret before starting the app."
    );
  }

  const rawUrl = process.env.NEXTAUTH_URL?.trim();
  if (!rawUrl) {
    throw new Error(
      "Missing required NEXTAUTH_URL. Set it to the exact app origin (for example http://localhost:3000)."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      `Invalid NEXTAUTH_URL: "${rawUrl}". Expected an absolute URL like http://localhost:3000.`
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Invalid NEXTAUTH_URL protocol "${parsed.protocol}". Use http:// or https://.`
    );
  }

  return secret;
}

export function validateDatabaseEnv(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Missing required DATABASE_URL. Set a valid database connection string before starting the app."
    );
  }

  if (databaseUrl.includes("replace-with")) {
    throw new Error(
      "Invalid DATABASE_URL placeholder value. Set a real database connection string."
    );
  }

  return databaseUrl;
}
