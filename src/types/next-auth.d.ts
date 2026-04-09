import "next-auth";

declare module "next-auth" {
  interface User {
    emailVerified?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      emailVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified?: boolean;
  }
}
