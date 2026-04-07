export const dynamic = "force-dynamic";
// BACKEND_ENGINEER_AGENT: Events CRUD API
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const bookmarked = searchParams.get("bookmarked");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // Build where clause (user-scoped for data isolation)
    const where: any = {
      userId: session.user.id,
      isDismissed: false,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (bookmarked === "true") {
      where.isBookmarked = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    // Sort order
    let orderBy: any = { extractedAt: "desc" };
    if (sort === "date") orderBy = { eventDate: "asc" };
    if (sort === "confidence") orderBy = { confidence: "desc" };
    if (sort === "oldest") orderBy = { extractedAt: "asc" };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("Events GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
