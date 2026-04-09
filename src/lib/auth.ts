import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateAuthEnv } from "@/lib/auth-env";

const authSecret = validateAuthEnv();

export const authOptions: NextAuthOptions = {
  providers: [
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = Boolean(user.emailVerified);
        token.emailVerificationReminderPending = Boolean(
          user.emailVerificationReminderPending
        );
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
