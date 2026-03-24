import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const loggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) &&
    !loggedIn
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
