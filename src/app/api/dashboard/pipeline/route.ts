import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DealStatus } from "@/generated/prisma/enums";
import {
  DEFAULT_DEAL_SOURCES,
  DEFAULT_FRESHNESS_ALERT_DAYS,
  DEFAULT_FRESHNESS_WARN_DAYS,
  DEFAULT_PROBABILITY_RATES,
  bySource,
  daysSince,
  freshness,
  isOverdue,
  parseSources,
  weightedAmount,
  weightedByStatus,
  type Probability,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/**
 * パイプラインの集計（Phase B）。
 *
 * 既存の /api/dashboard/stats は請求・月報の集計で込み入っているので、
 * パイプラインの数字は別に出す。関心事が違うし、既存の売上集計を壊すリスクを
 * 負う理由がない。
 *
 * 「今週動かすべき案件がスクロールなしで見える」（受け入れ基準3）ために、
 * 集計だけでなく **放置案件と期日超過の実物** も返す。
 */

// パイプラインとして「動いている」ステータス。終了・失注は数えない
const OPEN_STATUSES: DealStatus[] = [
  "lead",
  "discussion",
  "expected",
  "active",
  "renewal",
];

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();
    const rates: Record<Probability, number> = {
      high: settings?.probabilityHighRate ?? DEFAULT_PROBABILITY_RATES.high,
      mid: settings?.probabilityMidRate ?? DEFAULT_PROBABILITY_RATES.mid,
      low: settings?.probabilityLowRate ?? DEFAULT_PROBABILITY_RATES.low,
    };
    const warnDays = settings?.freshnessWarnDays ?? DEFAULT_FRESHNESS_WARN_DAYS;
    const alertDays =
      settings?.freshnessAlertDays ?? DEFAULT_FRESHNESS_ALERT_DAYS;
    const sources = settings?.dealSources
      ? parseSources(settings.dealSources)
      : DEFAULT_DEAL_SOURCES;

    const deals = await prisma.deal.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: {
        id: true,
        title: true,
        status: true,
        monthlyAmount: true,
        probability: true,
        source: true,
        nextAction: true,
        nextActionDate: true,
        lastActivityAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();

    // 放置案件（鮮度が赤）。古い順＝手を打つべき順に並べる
    const stale = deals
      .filter(
        (d) => freshness(d.lastActivityAt, { now, warnDays, alertDays }) === "alert",
      )
      .map((d) => ({
        id: d.id,
        title: d.title,
        clientName: d.client.name,
        status: d.status,
        lastActivityAt: d.lastActivityAt,
        days: daysSince(d.lastActivityAt, now),
      }))
      .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));

    // 期日を過ぎた次アクション。期日の古い順
    const overdue = deals
      .filter((d) => d.nextAction && isOverdue(d.nextActionDate, now))
      .map((d) => ({
        id: d.id,
        title: d.title,
        clientName: d.client.name,
        nextAction: d.nextAction,
        nextActionDate: d.nextActionDate,
      }))
      .sort(
        (a, b) =>
          new Date(a.nextActionDate!).getTime() -
          new Date(b.nextActionDate!).getTime(),
      );

    return NextResponse.json({
      weightedTotal: weightedAmount(deals, rates),
      weightedByStatus: weightedByStatus(deals, rates),
      bySource: bySource(deals),
      stale,
      overdue,
      settings: { rates, warnDays, alertDays, sources },
    });
  } catch (error) {
    console.error("Failed to build pipeline stats:", error);
    return NextResponse.json(
      { error: "Failed to build pipeline stats" },
      { status: 500 },
    );
  }
}
