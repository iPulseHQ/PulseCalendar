import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { ensureUserExists } from "@/lib/auth/ensure-user";

export async function POST(request: NextRequest) {
  try {
    // Verify that user is authenticated via Clerk
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;

    await ensureUserExists({
      id: user.id,
      email: email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
      image: user.imageUrl || null,
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, email || "");
    const refreshToken = generateRefreshToken(user.id, email || "");

    return NextResponse.json({
      token: accessToken,
      refreshToken,
      userId: user.id,
      email: email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
      image: user.imageUrl || null,
    });
  } catch (error) {
    console.error("Desktop token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate tokens" },
      { status: 500 }
    );
  }
}
