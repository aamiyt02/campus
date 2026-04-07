export const dynamic = "force-dynamic";
// BACKEND_ENGINEER_AGENT: Dashboard stats API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [
      totalEvents,
      upcomingEvents,
      categories,
      recentSync,
      bookmarkedCount,
    ] = await Promise.all([
      prisma.event.count({
        where: { userId, isDismissed: false },
      }),
      prisma.event.count({
        where: {
          userId,
          isDismissed: false,
          eventDate: { gte: new Date() },
        },
      }),
      prisma.event.groupBy({
        by: ["category"],
        where: { userId, isDismissed: false },
        _count: { category: true },
      }),
      prisma.syncLog.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
      }),
      prisma.event.count({
        where: { userId, isBookmarked: true, isDismissed: false },
      }),
    ]);

    const categoryMap: Record<string, number> = {};
    categories.forEach((c) => {
      categoryMap[c.category] = c._count.category;
    });

    return NextResponse.json({
      totalEvents,
      upcomingEvents,
      bookmarkedCount,
      categories: categoryMap,
      lastSync: recentSync
        ? {
            status: recentSync.status,
            emailsFound: recentSync.emailsFound,
            eventsFound: recentSync.eventsFound,
            startedAt: recentSync.startedAt,
            completedAt: recentSync.completedAt,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
