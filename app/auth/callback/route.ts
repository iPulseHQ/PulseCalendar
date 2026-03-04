import { NextResponse } from "next/server";

/**
 * Auth callback route — was used for Supabase OAuth code exchange.
 * With Clerk, OAuth is handled automatically. This route just redirects
 * to /dashboard for any legacy links that might still hit this endpoint.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  let next = searchParams.get("next") ?? "/dashboard";

  try {
    next = decodeURIComponent(next);
  } catch {
    next = "/dashboard";
  }

  return NextResponse.redirect(`${origin}${next}`);
}
