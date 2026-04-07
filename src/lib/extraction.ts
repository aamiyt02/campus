// EXTRACTION_ENGINE_AGENT: Rule-based event extraction from email text
// Handles dates, times, links, categories, deadlines with robust fallbacks

export interface ExtractedEvent {
  title: string;
  description: string | null;
  category: string;
  eventDate: Date | null;
  eventEndDate: Date | null;
  eventTime: string | null;
  location: string | null;
  registrationUrl: string | null;
  deadline: Date | null;
  deadlineText: string | null;
  confidence: number;
}

// ─── DATE EXTRACTION ───────────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

function parseYear(y: string): number {
  const num = parseInt(y, 10);
  if (num < 100) {
    return num < 50 ? 2000 + num : 1900 + num;
  }
  return num;
}

function extractDates(text: string): Date[] {
  const dates: Date[] = [];
  const now = new Date();

  // Pattern 1: "12 March 2026", "12th March 2026", "12 Mar, 2026"
  const p1 = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[\s,]*(\d{2,4})?/gi;
  let m;
  while ((m = p1.exec(text)) !== null) {
    const day = parseInt(m[1], 10);
    const month = MONTH_MAP[m[2].toLowerCase()];
    const year = m[3] ? parseYear(m[3]) : now.getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      dates.push(new Date(year, month, day));
    }
  }

  // Pattern 2: "March 12, 2026", "March 12th"
  const p2 = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{2,4})?/gi;
  while ((m = p2.exec(text)) !== null) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    const day = parseInt(m[2], 10);
    const year = m[3] ? parseYear(m[3]) : now.getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      dates.push(new Date(year, month, day));
    }
  }

  // Pattern 3: "12/03/2026", "12-03-2026", "2026-03-12"
  const p3 = /(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/g;
  while ((m = p3.exec(text)) !== null) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const c = parseInt(m[3], 10);

    if (a > 31) {
      // YYYY-MM-DD
      if (b >= 1 && b <= 12 && c >= 1 && c <= 31) {
        dates.push(new Date(a, b - 1, c));
      }
    } else if (c > 31) {
      // DD/MM/YYYY
      if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
        dates.push(new Date(parseYear(c.toString()), b - 1, a));
      }
    } else {
      // DD/MM/YY
      if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
        dates.push(new Date(parseYear(c.toString()), b - 1, a));
      }
    }
  }

  return dates;
}

// ─── TIME EXTRACTION ───────────────────────────────────────────
function extractTime(text: string): string | null {
  // "10:00 AM", "2:30 PM", "14:30", "2 PM"
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
    /(\d{1,2})\s*(am|pm)/gi,
    /(\d{1,2}):(\d{2})\s*(?:hrs?|hours?)?/gi,
  ];

  for (const pat of patterns) {
    const m = pat.exec(text);
    if (m) {
      if (m[3]) {
        // AM/PM format
        let hour = parseInt(m[1], 10);
        const min = m[2] ? parseInt(m[2], 10) : 0;
        const ampm = m[3].toLowerCase();
        if (ampm === "pm" && hour !== 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      } else {
        // 24h format
        const hour = parseInt(m[1], 10);
        const min = m[2] ? parseInt(m[2], 10) : 0;
        if (hour >= 0 && hour <= 23) {
          return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        }
      }
    }
  }
  return null;
}

// ─── LINK EXTRACTION ───────────────────────────────────────────
function extractLinks(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

function findRegistrationUrl(links: string[], text: string): string | null {
  const regKeywords = ["register", "signup", "sign-up", "apply", "rsvp", "form", "enroll", "registration"];
  for (const link of links) {
    const lower = link.toLowerCase();
    if (regKeywords.some((kw) => lower.includes(kw))) {
      return link;
    }
  }
  // Check nearby text for registration keywords
  for (const link of links) {
    const idx = text.indexOf(link);
    if (idx >= 0) {
      const surrounding = text.slice(Math.max(0, idx - 80), idx + link.length + 80).toLowerCase();
      if (regKeywords.some((kw) => surrounding.includes(kw))) {
        return link;
      }
    }
  }
  return links.length > 0 ? links[0] : null;
}

// ─── CATEGORY CLASSIFICATION ──────────────────────────────────
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "academic",
    keywords: ["workshop", "seminar", "lecture", "conference", "symposium", "webinar", "tutorial", "research", "paper", "thesis", "exam", "quiz", "class", "course", "assignment"],
  },
  {
    category: "cultural",
    keywords: ["fest", "festival", "dance", "music", "art", "drama", "theater", "concert", "cultural", "performance", "show", "entertainment", "singing", "band"],
  },
  {
    category: "career",
    keywords: ["placement", "internship", "job", "career", "recruitment", "hiring", "interview", "resume", "cv", "offer", "vacancy", "company", "corporate"],
  },
  {
    category: "sports",
    keywords: ["sports", "tournament", "match", "cricket", "football", "basketball", "athletics", "marathon", "run", "fitness", "gym", "game"],
  },
  {
    category: "clubs",
    keywords: ["club", "society", "meetup", "chapter", "community", "session", "gathering", "meeting", "committee"],
  },
  {
    category: "deadline",
    keywords: ["deadline", "last date", "due date", "submit", "submission", "apply before", "closing date"],
  },
];

function classifyCategory(text: string): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) score += matches.length;
    }
    if (score > 0) scores[rule.category] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : "general";
}

// ─── DEADLINE DETECTION ────────────────────────────────────────
function extractDeadline(text: string): { date: Date | null; text: string | null } {
  const deadlinePatterns = [
    /(?:last\s+date|deadline|apply\s+before|register\s+before|submit\s+by|due\s+date|closing\s+date|registration\s+closes?)[\s:]*(.{0,60})/gi,
  ];

  for (const pat of deadlinePatterns) {
    const m = pat.exec(text);
    if (m && m[1]) {
      const snippet = m[1].trim();
      const dates = extractDates(snippet);
      return {
        date: dates.length > 0 ? dates[0] : null,
        text: snippet.slice(0, 80),
      };
    }
  }
  return { date: null, text: null };
}

// ─── LOCATION EXTRACTION ──────────────────────────────────────
function extractLocation(text: string): string | null {
  const locationPatterns = [
    /(?:venue|location|place|where|hall|room|auditorium|building)[\s:]+([^\n.]{3,60})/gi,
    /(?:at|in)\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Hall|Room|Center|Centre|Auditorium|Lab|Block|Building|Campus))/g,
  ];

  for (const pat of locationPatterns) {
    const m = pat.exec(text);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return null;
}

// ─── TITLE EXTRACTION ─────────────────────────────────────────
function extractTitle(subject: string, body: string): string {
  // Use email subject as primary title source
  if (subject && subject.length > 3) {
    // Clean up common prefixes
    return subject
      .replace(/^(re:|fwd?:|fw:)\s*/gi, "")
      .replace(/^\[.*?\]\s*/, "")
      .trim()
      .slice(0, 120) || "Untitled Event";
  }

  // Fallback: first meaningful line from body
  const lines = body.split("\n").filter((l) => l.trim().length > 10);
  if (lines.length > 0) {
    return lines[0].trim().slice(0, 120);
  }

  return "Untitled Event";
}

// ─── CONFIDENCE SCORING ───────────────────────────────────────
function calculateConfidence(event: Partial<ExtractedEvent>): number {
  let score = 0.2; // base
  if (event.eventDate) score += 0.25;
  if (event.eventTime) score += 0.1;
  if (event.location) score += 0.1;
  if (event.registrationUrl) score += 0.15;
  if (event.category && event.category !== "general") score += 0.1;
  if (event.deadline) score += 0.1;
  return Math.min(score, 1.0);
}

// ─── MAIN EXTRACTION FUNCTION ──────────────────────────────────
export function extractEventFromEmail(
  subject: string,
  body: string,
  snippet?: string
): ExtractedEvent {
  const fullText = `${subject}\n${body}\n${snippet || ""}`;

  const dates = extractDates(fullText);
  const time = extractTime(fullText);
  const links = extractLinks(body);
  const regUrl = findRegistrationUrl(links, fullText);
  const category = classifyCategory(fullText);
  const { date: deadlineDate, text: deadlineText } = extractDeadline(fullText);
  const location = extractLocation(fullText);
  const title = extractTitle(subject, body);

  const event: ExtractedEvent = {
    title,
    description: snippet || body.slice(0, 300) || null,
    category,
    eventDate: dates.length > 0 ? dates[0] : null,
    eventEndDate: dates.length > 1 ? dates[1] : null,
    eventTime: time,
    location,
    registrationUrl: regUrl,
    deadline: deadlineDate,
    deadlineText,
    confidence: 0,
  };

  event.confidence = calculateConfidence(event);

  return event;
}

// ─── EVENT KEYWORD FILTER ──────────────────────────────────────
const EVENT_KEYWORDS = [
  "event", "invite", "invitation", "workshop", "seminar", "conference",
  "webinar", "meetup", "hackathon", "fest", "festival", "competition",
  "tournament", "placement", "internship", "recruitment", "deadline",
  "register", "registration", "rsvp", "attend", "join us", "you are invited",
  "cultural", "annual", "ceremony", "celebration", "session", "talk",
  "lecture", "symposium", "summit", "bootcamp", "orientation",
];

export function isLikelyEventEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return EVENT_KEYWORDS.some((kw) => text.includes(kw));
}
