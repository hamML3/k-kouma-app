import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Server Actions are POST requests with 'next-action' header.
  // Their IDs are signed by Next.js — let them reach the page handler directly.
  if (req.headers.has("next-action")) {
    return NextResponse.next();
  }

  const isAuthenticated = !!req.auth;

  const publicRoutes = [
    "/api/auth",
    "/api/therapists",
    "/login",
    "/register",
    "/",
  ];

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
