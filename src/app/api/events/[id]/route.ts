// BACKEND_ENGINEER_AGENT: Single event actions (bookmark, dismiss, read)
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify event belongs to user (data isolation)
    const event = await prisma.event.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only allow updating specific fields
    const allowedFields = ["isRead", "isBookmarked", "isDismissed"];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = Boolean(body[field]);
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ event: updated });
  } catch (err: any) {
    console.error("Event PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify event belongs to user
    const event = await prisma.event.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Event DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
