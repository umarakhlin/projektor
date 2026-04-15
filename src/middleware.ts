import { withAuth } from "next-auth/middleware";

// Protect routes that require login
export default withAuth({
  pages: { signIn: "/auth/signin" }
});

export const config = {
  matcher: [
    "/create/:path*",
    "/my-projects/:path*",
    "/saved",
    "/inbox/:path*",
    "/team-space",
    "/talent",
    "/profile/:path*",
    "/admin/:path*",
    "/projects/:id/space"
  ]
};
