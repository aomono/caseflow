import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/api-token";
import { daysSince, freshness } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/**
 * 外部API（C-2）。きおい（Telegramエージェント）からの更新・照会に使う。
 *
 * **パスを /api/external/ に分けている**。middleware が api/auth と api/cron
 * 以外の全ルートに NextAuth を要求しているので、既存の /api/deals をそのまま
 * 外部へ開くと**社内UIの保護まで外れる**。別パスにして、そこだけ Bearer で
 * 守る（除外の範囲が1行で読めるのも大事なところ）。
 */

const OPEN = ["lead", "discussion", "expected", "active", "renewal"] as const;

export async function GET(request: NextRequest) {
  const user = await verifyToken(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const staleParam = searchParams.get("stale");
    const status = searchParams.get("status");

    const deals = await prisma.deal.findMany({
      where: status ? { status: status as never } : { status: { in: [...OPEN] } },
      select: {
        id: true,
        title: true,
        status: true,
        probability: true,
        monthlyAmount: true,
        source: true,
        nextAction: true,
        nextActionDate: true,
        lastActivityAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();
    let rows = deals.map((d) => ({
      ...d,
      clientName: d.client.name,
      staleDays: daysSince(d.lastActivityAt, now),
      freshness: freshness(d.lastActivityAt, { now }),
    }));

    // ?stale=14 で「14日以上動いていない案件」。放置の掘り起こしに使う
    if (staleParam !== null) {
      const threshold = Number(staleParam);
      if (!Number.isFinite(threshold) || threshold < 0) {
        return NextResponse.json(
          { error: `invalid stale: ${staleParam}` },
          { status: 400 },
        );
      }
      // 未接触（null）は「ずっと動いていない」ので必ず含める
      rows = rows
        .filter((r) => r.staleDays === null || r.staleDays >= threshold)
        .sort((a, b) => (b.staleDays ?? Infinity) - (a.staleDays ?? Infinity));
    }

    console.log(`[external] ${user.name} GET /deals (${rows.length}件)`);
    return NextResponse.json({ deals: rows });
  } catch (error) {
    console.error("Failed to list deals (external):", error);
    return NextResponse.json({ error: "Failed to list deals" }, { status: 500 });
  }
}
