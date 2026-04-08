import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { authOptions } from "@/lib/auth";

/**
 * Resolve the current user id in App Router route handlers (same idea as /api/profile).
 */
export async function getUserIdFromCookies(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const headersList = await headers();
  const cookieStore = await cookies();
  const req = {
    headers: Object.fromEntries(headersList.entries()),
    cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value]))
  };

  const token = await getToken({ req: req as never, secret });
  if (!token) return null;

  const t = token as Record<string, unknown>;
  const id = typeof t.id === "string" ? t.id : null;
  const sub = typeof t.sub === "string" ? t.sub : null;
  return id || sub || null;
}
