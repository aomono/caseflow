import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildCashflow,
  buildForecast,
  currentFiscalYear,
  fiscalYearRange,
  type CostCategory,
  type CostOverride,
  type ForecastDeal,
} from "@/lib/forecast";
import type { RevenueInvoice } from "@/lib/revenue";
import { DEFAULT_PROBABILITY_RATES } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/**
 * FY月次ビュー（売上マトリクス＋資金繰り）。
 *
 * 計算は lib/forecast.ts。ここは取得と組み立てだけ。
 * 終了・失注の案件も**Invoiceの実績があれば**マトリクスに出るよう、Deal は
 * 状態で絞らない（案件の生死と請求実績は独立、の原則をここでも通す）。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const fyParam = searchParams.get("fy");
    const fy = fyParam ? parseInt(fyParam, 10) : currentFiscalYear(now);
    if (!Number.isFinite(fy)) {
      return NextResponse.json({ error: `invalid fy: ${fyParam}` }, { status: 400 });
    }
    const weighted = searchParams.get("weighted") === "1";
    const { start, end } = fiscalYearRange(fy);

    const [settings, deals, invoices, overrideRows] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.deal.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          monthlyAmount: true,
          billingType: true,
          contractAmount: true,
          prorateBase: true,
          contractStartDate: true,
          contractEndDate: true,
          source: true,
          probability: true,
          client: { select: { name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: {
          status: { in: ["sent", "paid", "overdue"] },
          year: { in: [start.getFullYear(), end.getFullYear()] },
        },
        select: {
          dealId: true,
          year: true,
          month: true,
          amount: true,
          deal: { select: { client: { select: { name: true } } } },
        },
      }),
      prisma.monthlyCostOverride.findMany(),
    ]);

    const matrix = buildForecast(deals as ForecastDeal[], invoices as RevenueInvoice[], {
      fy,
      now,
      cutoverDate: settings?.revenueCutoverDate ?? null,
      weighted,
      rates: {
        high: settings?.probabilityHighRate ?? DEFAULT_PROBABILITY_RATES.high,
        mid: settings?.probabilityMidRate ?? DEFAULT_PROBABILITY_RATES.mid,
        low: settings?.probabilityLowRate ?? DEFAULT_PROBABILITY_RATES.low,
      },
    });

    const overrides: CostOverride[] = overrideRows.map((o) => ({
      month: `${o.year}-${String(o.month).padStart(2, "0")}`,
      category: o.category as CostCategory,
      amount: o.amount,
    }));

    const cashflow = buildCashflow(matrix.months, matrix.monthTotals, {
      defaults: {
        payment: settings?.monthlyPayment ?? 0,
        execComp: settings?.monthlyExecComp ?? 0,
        expense: settings?.monthlyExpense ?? 0,
      },
      overrides,
      openingBalance: settings?.openingBalance ?? 0,
    });

    // FY切替タブ用。案件の契約期間から実在する年度を出す
    const years = new Set<number>([currentFiscalYear(now), fy]);
    for (const d of deals) {
      for (const dt of [d.contractStartDate, d.contractEndDate]) {
        if (dt) years.add(currentFiscalYear(dt));
      }
    }

    return NextResponse.json({
      fy,
      weighted,
      matrix,
      cashflow,
      fiscalYears: [...years].sort((a, b) => b - a),
    });
  } catch (error) {
    console.error("Failed to build forecast:", error);
    return NextResponse.json({ error: "Failed to build forecast" }, { status: 500 });
  }
}
