// BACKEND_ENGINEER_AGENT: Gmail API integration service
import { google } from "googleapis";

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  body: string;
  snippet: string;
  date: Date;
}

export async function fetchGmailMessages(
  accessToken: string,
  maxResults: number = 50
): Promise<GmailMessage[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  // Fetch message list
  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "newer_than:30d", // Last 30 days to limit free-tier usage
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) return [];

  // Fetch each message's details (batch to limit API calls)
  const messages: GmailMessage[] = [];

  for (const msg of messageIds) {
    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = detail.data.payload?.headers || [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const fromHeader =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";

      // Parse from field: "Name <email>" or just "email"
      const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].replace(/"/g, "").trim() : fromHeader;
      const fromEmail = fromMatch ? fromMatch[2] : fromHeader;

      const dateHeader =
        headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

      // Extract body
      const body = extractBody(detail.data.payload);

      messages.push({
        id: msg.id!,
        subject,
        from: fromName,
        fromEmail,
        body,
        snippet: detail.data.snippet || "",
        date: new Date(dateHeader || Date.now()),
      });
    } catch (err) {
      console.error(`Failed to fetch message ${msg.id}:`, err);
      continue; // Never crash - skip failed messages
    }
  }

  return messages;
}

function extractBody(payload: any): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart
  if (payload.parts) {
    // Prefer text/plain, fallback to text/html
    const textPart = payload.parts.find(
      (p: any) => p.mimeType === "text/plain"
    );
    if (textPart?.body?.data) {
      return decodeBase64(textPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (p: any) => p.mimeType === "text/html"
    );
    if (htmlPart?.body?.data) {
      return stripHtml(decodeBase64(htmlPart.body.data));
    }

    // Nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function decodeBase64(data: string): string {
  try {
    const decoded = Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    return decoded;
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
