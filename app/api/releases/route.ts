import { NextResponse } from "next/server";

const REPO_OWNER = "iPulseHQ";
const REPO_NAME = "PulseCalendar";

export async function GET() {
  const token = process.env.GITHUB_RELEASES_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "PulseCalendar-opencalendar",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    // First try the dedicated latest endpoint.
    let releaseResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!releaseResponse.ok) {
      // Fallback: list releases and pick first non-draft/non-prerelease.
      releaseResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
        {
          headers,
          cache: "no-store",
        }
      );
    }

    if (!releaseResponse.ok) {
      return NextResponse.json(null, { status: 404 });
    }

    const payload = await releaseResponse.json();

    const release = Array.isArray(payload)
      ? payload.find((r: { draft: boolean; prerelease: boolean }) => !r.draft && !r.prerelease) || payload[0]
      : payload;

    if (!release) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json({
      tag_name: release.tag_name,
      assets: (release.assets || []).map((a: { name: string; browser_download_url: string; size: number }) => ({
        name: a.name,
        browser_download_url: a.browser_download_url,
        size: a.size,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch releases", error);
    return NextResponse.json(null, { status: 500 });
  }
}
