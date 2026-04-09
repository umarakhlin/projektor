import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { issueEmailVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email-sender";

export async function POST(req: Request) {
  const clientId = getClientId(req);
  const { ok } = await rateLimit(`signup:${clientId}`, 5, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json();
    const rawEmail = body.email;
    const password = body.password;
    const name = body.name;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: email as string } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null
      }
    });

    const origin = req.headers.get("origin");
    const verificationUrl = await issueEmailVerificationToken(user.id, origin);
    const emailSent = await sendVerificationEmail(user.email, verificationUrl);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      verificationRequired: true,
      emailSent,
      // Keep fallback behavior for development until SMTP/API key exists.
      verificationUrl: emailSent ? undefined : verificationUrl
    });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
