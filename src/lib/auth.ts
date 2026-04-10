import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateAuthEnv } from "@/lib/auth-env";

const authSecret = validateAuthEnv();
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret
          })
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email }
        });
        if (!user?.passwordHash) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          emailVerified: Boolean(user.emailVerifiedAt),
          emailVerificationReminderPending: Boolean(
            user.emailVerificationReminderPending
          )
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const email = user.email.trim().toLowerCase();
      await prisma.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          emailVerifiedAt: new Date()
        },
        create: {
          email,
          passwordHash: null,
          name: user.name ?? null,
          emailVerifiedAt: new Date()
        }
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: {
              id: true,
              emailVerifiedAt: true,
              emailVerificationReminderPending: true
            }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.emailVerified = Boolean(dbUser.emailVerifiedAt);
            token.emailVerificationReminderPending = Boolean(
              dbUser.emailVerificationReminderPending
            );
          }
        } else {
          token.id = user.id;
          token.emailVerified = Boolean(user.emailVerified);
          token.emailVerificationReminderPending = Boolean(
            user.emailVerificationReminderPending
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.emailVerified = Boolean(token.emailVerified);
        session.user.emailVerificationReminderPending = Boolean(
          token.emailVerificationReminderPending
        );
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin"
  },
  secret: authSecret,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
