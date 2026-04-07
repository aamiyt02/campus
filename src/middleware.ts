import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/events/:path*", "/api/sync/:path*", "/api/stats/:path*"],
};
