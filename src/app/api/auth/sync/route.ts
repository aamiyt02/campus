import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { idToken, googleAccessToken, expiresAt } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    const { userId, error: authError } = await getUserIdFromToken(idToken);
    if (!userId) {
      return NextResponse.json({ error: authError || "Invalid token" }, { status: 401 });
    }

    // If Google Access Token is provided, store it in the Account table
    if (googleAccessToken) {
      // Find or create the account entry for this user and provider
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: userId, // Using Firebase UID as provider account ID as well
          },
        },
        update: {
          access_token: googleAccessToken,
          expires_at: expiresAt ? Math.floor(expiresAt / 1000) : null,
        },
        create: {
          userId: userId,
          type: "oauth",
          provider: "google",
          providerAccountId: userId,
          access_token: googleAccessToken,
          expires_at: expiresAt ? Math.floor(expiresAt / 1000) : null,
        },
      });
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    console.error("Auth Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
