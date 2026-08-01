import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const activities = await prisma.activity.findMany({
      where: { dealId: id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Failed to list activities:", error);
    return NextResponse.json(
      { error: "Failed to list activities" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, date, summary } = body;

    if (!type || !date || !summary) {
      return NextResponse.json(
        { error: "type, date, and summary are required" },
        { status: 400 },
      );
    }

    const activityDate = new Date(date);
    const activity = await prisma.activity.create({
      data: {
        dealId: id,
        type,
        date: activityDate,
        summary,
      },
    });

    // 鮮度バッジと stale 検索が毎回 Activity を集計しなくて済むよう、最新の
    // 接触日を Deal 側に持つ。過去の日付を後から登録することがあるので、
    // 「より新しいときだけ」更新する（遡って古い日付で上書きしない）
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: { lastActivityAt: true },
    });
    if (deal && (!deal.lastActivityAt || deal.lastActivityAt < activityDate)) {
      await prisma.deal.update({
        where: { id },
        data: { lastActivityAt: activityDate },
      });
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}
