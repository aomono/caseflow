import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEAL_STATUSES,
  PROBABILITIES,
  type Suggestion,
} from "@/lib/bulk-update";

export const dynamic = "force-dynamic";

/**
 * 確認済みの提案だけを反映する（C-1の後半）。
 *
 * ここは**AIを呼ばない**。ユーザーが確認画面で残したものだけを受け取り、
 * 値を検証してから書く。analyze と apply を分けているのは、
 * 「無確認の自動書き込みが存在しない」を構造で保証するため——分けていないと
 * 「解析したついでに書く」経路がいつか生える。
 *
 * dealId が無い提案は**適用しない**。照合が曖昧なまま書くと台帳が壊れる。
 */

type Applied = { kind: string; dealId: string | null; ok: boolean; error?: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const suggestions: Suggestion[] = Array.isArray(body?.suggestions)
      ? body.suggestions
      : [];
    if (suggestions.length === 0) {
      return NextResponse.json({ error: "suggestions is required" }, { status: 400 });
    }

    const results: Applied[] = [];

    for (const s of suggestions) {
      const kind = s?.kind;
      try {
        if (kind === "newDeal") {
          // 新規案件は clientName の一致でのみ作る。無ければ作らない
          // （クライアントを勝手に増やすと台帳が二重になる）
          if (!s.title || !s.clientName) throw new Error("title/clientName が無い");
          const client = await prisma.client.findFirst({
            where: { name: s.clientName },
            select: { id: true },
          });
          if (!client) throw new Error(`クライアントが見つかりません: ${s.clientName}`);
          await prisma.deal.create({
            data: { clientId: client.id, title: s.title, status: "lead" },
          });
          results.push({ kind, dealId: null, ok: true });
          continue;
        }

        // 以降は既存案件への更新。照合できていないものは適用しない
        if (!s.dealId) throw new Error("対象の案件が特定されていません");
        const exists = await prisma.deal.findUnique({
          where: { id: s.dealId },
          select: { id: true, lastActivityAt: true },
        });
        if (!exists) throw new Error("案件が存在しません");

        if (kind === "status") {
          if (!DEAL_STATUSES.includes(s.value as never)) {
            throw new Error(`不正なステータス: ${s.value}`);
          }
          await prisma.deal.update({
            where: { id: s.dealId },
            data: { status: s.value as never },
          });
        } else if (kind === "probability") {
          if (!PROBABILITIES.includes(s.value as never)) {
            throw new Error(`不正な確度: ${s.value}`);
          }
          await prisma.deal.update({
            where: { id: s.dealId },
            data: { probability: s.value as never },
          });
        } else if (kind === "nextAction") {
          if (!s.action) throw new Error("次アクションが空です");
          const date = s.date ? new Date(s.date) : null;
          if (date && Number.isNaN(date.getTime())) {
            throw new Error(`不正な期日: ${s.date}`);
          }
          await prisma.deal.update({
            where: { id: s.dealId },
            data: { nextAction: s.action, nextActionDate: date },
          });
        } else if (kind === "activity") {
          if (!s.summary) throw new Error("メモが空です");
          const now = new Date();
          await prisma.activity.create({
            data: {
              dealId: s.dealId,
              type: "note",
              date: now,
              summary: s.summary,
            },
          });
          // 一覧の鮮度に効くので、接触日も進める（Activity API と同じ規則）
          if (!exists.lastActivityAt || exists.lastActivityAt < now) {
            await prisma.deal.update({
              where: { id: s.dealId },
              data: { lastActivityAt: now },
            });
          }
        } else {
          throw new Error(`未知の種別: ${kind}`);
        }

        results.push({ kind: String(kind), dealId: s.dealId, ok: true });
      } catch (e) {
        // 1件失敗しても残りは進める。全部巻き戻すと「どれが通ったか」が
        // 分からなくなり、ユーザーがやり直せない
        results.push({
          kind: String(kind ?? "unknown"),
          dealId: s?.dealId ?? null,
          ok: false,
          error: e instanceof Error ? e.message : "failed",
        });
      }
    }

    const applied = results.filter((r) => r.ok).length;
    return NextResponse.json({ applied, results });
  } catch (error) {
    console.error("Failed to apply suggestions:", error);
    return NextResponse.json(
      { error: "Failed to apply suggestions" },
      { status: 500 },
    );
  }
}
