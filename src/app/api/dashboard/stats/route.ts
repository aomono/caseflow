import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildRevenue,
  generateMonthRange,
  type RevenueDeal,
  type RevenueInvoice,
} from "@/lib/revenue";

export const dynamic = "force-dynamic";

// 会計年度: 6月〜翌5月（決算期5月末）
const FISCAL_YEAR_START_MONTH = 6; // 6月始まり

function getFiscalYearRange(fy: number): { start: Date; end: Date } {
  return {
    start: new Date(fy, FISCAL_YEAR_START_MONTH - 1, 1), // 6月1日
    end: new Date(fy + 1, FISCAL_YEAR_START_MONTH - 1, 0), // 翌年5月末日
  };
}

function getCurrentFiscalYear(): number {
  const now = new Date();
  // 1月〜5月は前年度の会計年度
  return now.getMonth() < FISCAL_YEAR_START_MONTH - 1
    ? now.getFullYear() - 1
    : now.getFullYear();
}

function getDateRange(
  period: string | null,
  fy: string | null
): { start: Date | null; end: Date | null } {
  if (fy) {
    const fyNum = fy === "current" ? getCurrentFiscalYear() : parseInt(fy, 10);
    if (!isNaN(fyNum)) {
      const range = getFiscalYearRange(fyNum);
      return { start: range.start, end: range.end };
    }
  }

  const now = new Date();
  switch (period) {
    case "3m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: null };
    case "6m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: null };
    case "12m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 12, 1), end: null };
    case "all":
    default:
      return { start: null, end: null };
  }
}

const STATUS_LABELS: Record<string, string> = {
  lead: "リード",
  discussion: "商談中",
  expected: "受注見込",
  active: "稼働中",
  renewal: "更新",
  closed: "終了",
  lost: "失注",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const fy = searchParams.get("fy");
  const { start: startDate, end: endDate } = getDateRange(period, fy);

  const now = new Date();
  const currentFiscalYear = getCurrentFiscalYear();

  // --- Monthly Revenue（実績=Invoice / 将来=Deal予測のハイブリッド） ---
  // 実績の真実は Invoice にある。Deal は契約の予定なので、月ごとに変わる実額や
  // 「lost にしても請求済みの事実は残る」を表現できない。
  const deals = await prisma.deal.findMany({
    where: {
      status: { in: ["active", "closed", "renewal", "discussion", "expected"] },
      OR: [
        { billingType: "monthly", monthlyAmount: { not: null } },
        { billingType: "lumpsum", contractAmount: { not: null } },
        { billingType: "prorated", monthlyAmount: { not: null } },
      ],
    },
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
      client: { select: { name: true } },
    },
  });

  // 請求済み（下書きは実績でない）。**Deal の status で絞らない**——
  // 案件が lost/closed でも請求の事実は消えない
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["sent", "paid", "overdue"] } },
    select: {
      dealId: true,
      year: true,
      month: true,
      amount: true,
      deal: { select: { client: { select: { name: true } } } },
    },
  });

  // カットオーバー以降は請求書発行基準（Invoice が無ければ実績にしない）。
  // 設定が無い環境では現行どおりのフォールバックになる
  const settings = await prisma.appSettings.findFirst({
    select: { revenueCutoverDate: true },
  });

  const {
    actualByMonth,
    contractedByMonth,
    prospectByMonth,
    revenueByClient,
    missingInvoices,
  } = buildRevenue(deals as RevenueDeal[], invoices as RevenueInvoice[], {
    startDate,
    endDate,
    now,
    cutoverDate: settings?.revenueCutoverDate ?? null,
  });

  // Merge all months — when fiscal year mode, ensure all 12 months are present
  const allMonths = new Set([
    ...Object.keys(actualByMonth),
    ...Object.keys(contractedByMonth),
    ...Object.keys(prospectByMonth),
  ]);

  // If fiscal year mode, fill in all months in the fiscal year range
  if (fy && startDate && endDate) {
    const fyMonths = generateMonthRange(startDate, endDate);
    for (const m of fyMonths) {
      allMonths.add(m);
    }
  }

  const sortedMonths = Array.from(allMonths).sort();
  const monthlyRevenue = sortedMonths.map((month) => ({
    month,
    actual: actualByMonth[month] ?? 0,
    contracted: contractedByMonth[month] ?? 0,
    prospect: prospectByMonth[month] ?? 0,
  }));

  // Cumulative revenue (for fiscal year view)
  let cumActual = 0;
  let cumContracted = 0;
  let cumProspect = 0;
  const cumulativeRevenue = sortedMonths.map((month) => {
    cumActual += actualByMonth[month] ?? 0;
    cumContracted += contractedByMonth[month] ?? 0;
    cumProspect += prospectByMonth[month] ?? 0;
    return {
      month,
      actual: cumActual,
      contracted: cumActual + cumContracted,
      prospect: cumActual + cumContracted + cumProspect,
    };
  });

  // --- Client Revenue ---
  const clientRevenue = Object.entries(revenueByClient)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Pipeline ---
  const allDeals = await prisma.deal.findMany({
    select: { status: true, monthlyAmount: true, billingType: true, contractAmount: true },
  });

  const pipelineMap: Record<string, { count: number; monthlyAmount: number; lumpsumAmount: number }> = {};
  for (const deal of allDeals) {
    if (!pipelineMap[deal.status]) {
      pipelineMap[deal.status] = { count: 0, monthlyAmount: 0, lumpsumAmount: 0 };
    }
    pipelineMap[deal.status].count += 1;
    if (deal.billingType === "lumpsum") {
      pipelineMap[deal.status].lumpsumAmount += deal.contractAmount ?? 0;
    } else {
      pipelineMap[deal.status].monthlyAmount += deal.monthlyAmount ?? 0;
    }
  }

  const pipeline = Object.entries(pipelineMap).map(([status, data]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count: data.count,
    monthlyAmount: data.monthlyAmount,
    lumpsumAmount: data.lumpsumAmount,
  }));

  // --- Revenue by Status (period-filtered, from monthly data) ---
  const statusRevenue = [
    { status: "実績", amount: sortedMonths.reduce((s, m) => s + (actualByMonth[m] ?? 0), 0) },
    { status: "契約済み", amount: sortedMonths.reduce((s, m) => s + (contractedByMonth[m] ?? 0), 0) },
    { status: "見込み", amount: sortedMonths.reduce((s, m) => s + (prospectByMonth[m] ?? 0), 0) },
  ].filter((item) => item.amount > 0);

  // --- Available Fiscal Years ---
  const [oldestDeal, newestDeal] = await Promise.all([
    prisma.deal.findFirst({
      where: { contractStartDate: { not: null } },
      orderBy: { contractStartDate: "asc" },
      select: { contractStartDate: true },
    }),
    prisma.deal.findFirst({
      where: { OR: [{ contractStartDate: { not: null } }, { contractEndDate: { not: null } }] },
      orderBy: { contractEndDate: "desc" },
      select: { contractStartDate: true, contractEndDate: true },
    }),
  ]);
  const toFiscalYear = (d: Date) =>
    d.getMonth() < FISCAL_YEAR_START_MONTH - 1 ? d.getFullYear() - 1 : d.getFullYear();
  const firstYear = oldestDeal?.contractStartDate
    ? toFiscalYear(oldestDeal.contractStartDate)
    : currentFiscalYear;
  const latestDate = newestDeal?.contractEndDate ?? newestDeal?.contractStartDate;
  const lastYear = latestDate
    ? Math.max(currentFiscalYear, toFiscalYear(latestDate))
    : currentFiscalYear;
  const fiscalYears: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    fiscalYears.push(y);
  }

  // --- Reminders (pending/reminded, limit 10) ---
  const reminders = await prisma.reminder.findMany({
    where: { status: { in: ["pending", "reminded"] } },
    include: { deal: true },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // --- Recent Activities (latest 10) ---
  const recentActivities = await prisma.activity.findMany({
    include: { deal: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    monthlyRevenue,
    cumulativeRevenue,
    clientRevenue,
    statusRevenue,
    pipeline,
    reminders,
    recentActivities,
    currentFiscalYear,
    fiscalYears,
    // 請求漏れの疑い（カットオーバー以降）と移行の残り（以前）
    missingInvoices,
  });
}
