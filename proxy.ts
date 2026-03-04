import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { corsMiddleware, handleCorsPreflightRequest } from "./middleware-cors";

const isPublicRoute = createRouteMatcher([
  "/",
  "/welcome(.*)",
  "/auth(.*)",
  "/api/(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/sitemap(.*)",
  "/robots(.*)",
  "/manifest.json",
  "/sw.js",
  "/browserconfig.xml",
  "/(.*).png",
  "/(.*).svg",
  "/(.*).ico",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/") ||
    req.nextUrl.pathname.startsWith("/auth/api/");

  // 1. Handle CORS preflight requests for API routes
  if (req.method === "OPTIONS" && isApiRoute) {
    return handleCorsPreflightRequest(req);
  }

  // Handle root route redirects
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = userId ? "/dashboard" : "/welcome";
    return NextResponse.redirect(url);
  }

  // Protected routes — Clerk redirects to NEXT_PUBLIC_CLERK_SIGN_IN_URL when unauthenticated
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Redirect authenticated users away from welcome pages
  if (userId && req.nextUrl.pathname.startsWith("/welcome")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Add CORS headers to API responses for desktop app
  if (isApiRoute) {
    return corsMiddleware(req, NextResponse.next());
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
