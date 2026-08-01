import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/api-token";

export const dynamic = "force-dynamic";

const TYPES = ["meeting", "email", "phone", "note"] as const;

/** ログ追記（C-2）。lastActivityAt の更新規則は画面側と揃える */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifyToken(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
    const type = body?.type ?? "note";

    if (!summary) {
      return NextResponse.json({ error: "summary is required" }, { status: 400 });
    }
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: `invalid type: ${type}` }, { status: 400 });
    }
    const date = body?.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: `invalid date: ${body.date}` }, { status: 400 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id },
      select: { id: true, lastActivityAt: true },
    });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const activity = await prisma.activity.create({
      data: { dealId: id, type, date, summary },
    });

    // 画面側と同じ単調更新。過去の記録を後から入れても遡って上書きしない
    if (!deal.lastActivityAt || deal.lastActivityAt < date) {
      await prisma.deal.update({
        where: { id },
        data: { lastActivityAt: date },
      });
    }

    console.log(`[external] ${user.name} POST /deals/${id}/activities`);
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity (external):", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
