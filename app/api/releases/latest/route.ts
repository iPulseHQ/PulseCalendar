import { NextResponse } from "next/server";

const REPO_OWNER = "iPulseHQ";
const REPO_NAME = "PulseCalendar";

interface TauriPlatform {
  signature: string;
  url: string;
}

interface TauriUpdateResponse {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [key: string]: TauriPlatform;
  };
}

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
    // Prefer latest endpoint for a public release stream.
    let releaseResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!releaseResponse.ok) {
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

    // Transform to Tauri updater format
    const tauriResponse: TauriUpdateResponse = {
      version: release.tag_name.replace(/^v/, ""), // Remove 'v' prefix if present
      notes: release.body || "New version available",
      pub_date: release.published_at || new Date().toISOString(),
      platforms: {},
    };

    // Parse assets and map to Tauri platforms
    for (const asset of release.assets || []) {
      const name = asset.name.toLowerCase();

      // Windows x64 - Look for .msi.zip.sig files
      if (name.endsWith(".msi.zip.sig")) {
        const downloadUrl = asset.browser_download_url.replace(".sig", "");
        const sigResponse = await fetch(asset.browser_download_url);
        if (!sigResponse.ok) {
          continue;
        }
        const signature = await sigResponse.text();

        tauriResponse.platforms["windows-x86_64"] = {
          signature: signature.trim(),
          url: downloadUrl,
        };
      }

      // Linux x64 - Look for .AppImage.tar.gz.sig files
      else if (name.includes("amd64") && name.endsWith(".appimage.tar.gz.sig")) {
        const downloadUrl = asset.browser_download_url.replace(".sig", "");
        const sigResponse = await fetch(asset.browser_download_url);
        if (!sigResponse.ok) {
          continue;
        }
        const signature = await sigResponse.text();

        tauriResponse.platforms["linux-x86_64"] = {
          signature: signature.trim(),
          url: downloadUrl,
        };
      }
    }

    // Only return update if we have at least one platform
    if (Object.keys(tauriResponse.platforms).length === 0) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(tauriResponse);
  } catch (error) {
    console.error("Failed to fetch release data:", error);
    return NextResponse.json({ error: "Failed to fetch release data" }, { status: 500 });
  }
}
