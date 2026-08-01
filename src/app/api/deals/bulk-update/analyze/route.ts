import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeText, type DealBrief } from "@/lib/bulk-update";

export const dynamic = "force-dynamic";

/**
 * 貼り付けたテキストから更新の**提案**を作る（C-1の前半）。
 *
 * このエンドポイントは**読むだけ**。ここで台帳に書き込まないことが、
 * 受け入れ基準5「無確認の自動書き込みが存在しない」の実体。
 * 反映は /apply（ユーザーが確認した提案だけを受け取る）が行う。
 */

// 照合の対象。終了・失注は候補に出さない（動いている案件の話しか来ない）
const OPEN = ["lead", "discussion", "expected", "active", "renewal"] as const;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const deals = await prisma.deal.findMany({
      where: { status: { in: [...OPEN] } },
      select: {
        id: true,
        title: true,
        status: true,
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const briefs: DealBrief[] = deals.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      clientName: d.client.name,
    }));

    const suggestions = await analyzeText(text, briefs);
    return NextResponse.json({ suggestions, deals: briefs });
  } catch (error) {
    console.error("Failed to analyze text:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 },
    );
  }
}
