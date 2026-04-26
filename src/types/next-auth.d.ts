import "next-auth";

declare module "next-auth" {
  interface User {
    emailVerified?: boolean;
    emailVerificationReminderPending?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      emailVerified?: boolean;
      emailVerificationReminderPending?: boolean;
    };
    sessionStartedAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified?: boolean;
    emailVerificationReminderPending?: boolean;
    sessionStartedAt?: number;
  }
}
