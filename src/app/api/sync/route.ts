// BACKEND_ENGINEER_AGENT: Sync emails → extract events → store in DB
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchGmailMessages } from "@/lib/gmail";
import { extractEventFromEmail, isLikelyEventEmail } from "@/lib/extraction";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's access token from the Account table
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "No Google account linked. Please re-authenticate." },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: { userId, status: "running" },
    });

    let emailsFound = 0;
    let eventsFound = 0;
    let errorMsg: string | null = null;

    try {
      // Fetch emails from Gmail
      const messages = await fetchGmailMessages(account.access_token, 50);
      emailsFound = messages.length;

      // Filter for likely event emails
      const eventEmails = messages.filter((msg) =>
        isLikelyEventEmail(msg.subject, msg.snippet)
      );

      // Process each event email
      for (const email of eventEmails) {
        try {
          // Check if already processed
          const existing = await prisma.event.findUnique({
            where: {
              userId_emailMessageId: {
                userId,
                emailMessageId: email.id,
              },
            },
          });

          if (existing) continue;

          // Extract event data
          const extracted = extractEventFromEmail(
            email.subject,
            email.body,
            email.snippet
          );

          // Store in database
          await prisma.event.create({
            data: {
              userId,
              emailMessageId: email.id,
              title: extracted.title,
              description: extracted.description,
              category: extracted.category,
              eventDate: extracted.eventDate,
              eventEndDate: extracted.eventEndDate,
              eventTime: extracted.eventTime,
              location: extracted.location,
              registrationUrl: extracted.registrationUrl,
              deadline: extracted.deadline,
              deadlineText: extracted.deadlineText,
              confidence: extracted.confidence,
              senderEmail: email.fromEmail,
              senderName: email.from,
              rawSubject: email.subject,
              rawSnippet: email.snippet,
              source: "gmail",
            },
          });

          eventsFound++;
        } catch (err) {
          console.error(`Error processing email ${email.id}:`, err);
          continue; // Never crash on individual email failures
        }
      }

      // Update user last sync time
      await prisma.user.update({
        where: { id: userId },
        data: { lastSyncAt: new Date() },
      });

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "success",
          emailsFound,
          eventsFound,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      errorMsg = err.message || "Unknown error during sync";
      console.error("Sync error:", err);

      // If token expired, try refreshing
      if (err.code === 401 || err.message?.includes("invalid_grant")) {
        errorMsg = "Gmail token expired. Please sign out and sign in again.";
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "error",
          emailsFound,
          eventsFound,
          errorMsg,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: !errorMsg,
      emailsFound,
      eventsFound,
      error: errorMsg,
    });
  } catch (err: any) {
    console.error("Sync endpoint error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
