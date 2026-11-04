import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isPublicPath } from "@/lib/publicRoutes";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Anciens diplômes et pièces d'identité : plus jamais servis directement,
  // même s'ils sont encore dans public/ (voir lib/therapistDocuments.ts).
  if (pathname.startsWith("/uploads/")) {
    return new NextResponse(null, { status: 404 });
  }

  // Server Actions are POST requests with 'next-action' header. They bypass
  // this check, so each action must verify the session itself.
  if (req.headers.has("next-action")) {
    return NextResponse.next();
  }

  if (!req.auth && !isPublicPath(pathname)) {
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
  // Les fichiers de public/ sont servis à la racine (/articles/x.jpg, /icon.png) :
  // tout chemin avec extension est exclu, sinon les visiteurs perdraient les images.
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)", "/uploads/:path*"],
};
