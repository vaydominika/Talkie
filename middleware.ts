import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAuthRoute = nextUrl.pathname === "/sign-in" || nextUrl.pathname === "/sign-up";
  const isAppRoute = nextUrl.pathname.startsWith("/app");

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/app/dashboard", nextUrl));
    }
    return;
  }

  if (isAppRoute && !isLoggedIn) {
    return Response.redirect(new URL("/sign-in", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!sign-in|sign-up|api|_next/static|_next/image|favicon.ico).*)"],
};
