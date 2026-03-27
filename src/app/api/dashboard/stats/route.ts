import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateProrate, type ProrateBaseType } from "@/lib/prorate";

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
    const fyNum = parseInt(fy, 10);
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

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function generateMonthRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    months.push(formatMonth(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
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
  const currentMonth = formatMonth(now);
  const currentFiscalYear = getCurrentFiscalYear();

  // --- Monthly Revenue (from deals by status) ---
  // actual = closed + active (past months) — work already done
  // contracted = active (current & future months) + renewal
  // prospect = discussion + expected
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

  const actualByMonth: Record<string, number> = {};
  const contractedByMonth: Record<string, number> = {};
  const prospectByMonth: Record<string, number> = {};
  const revenueByClient: Record<string, number> = {};

  for (const deal of deals) {
    if (deal.billingType === "lumpsum") {
      // 一括契約: 終了月にまとめて計上
      if (!deal.contractAmount || !deal.contractEndDate) continue;
      const endMonth = formatMonth(deal.contractEndDate);
      if (startDate && endMonth < formatMonth(startDate)) continue;

      if (deal.status === "closed") {
        actualByMonth[endMonth] = (actualByMonth[endMonth] ?? 0) + deal.contractAmount;
        revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.contractAmount;
      } else if (deal.status === "active" || deal.status === "renewal") {
        if (endMonth < currentMonth) {
          actualByMonth[endMonth] = (actualByMonth[endMonth] ?? 0) + deal.contractAmount;
          revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.contractAmount;
        } else {
          contractedByMonth[endMonth] = (contractedByMonth[endMonth] ?? 0) + deal.contractAmount;
        }
      } else {
        // discussion, expected
        if (deal.contractEndDate) {
          prospectByMonth[endMonth] = (prospectByMonth[endMonth] ?? 0) + deal.contractAmount;
        }
      }
    } else if (deal.billingType === "prorated") {
      // 日割り契約: 月ごとに日割り金額を計算
      if (!deal.monthlyAmount || !deal.contractStartDate || !deal.contractEndDate) continue;

      const dealStart = deal.contractStartDate;
      const dealEnd = deal.contractEndDate;
      const rangeStart = startDate && startDate > dealStart ? startDate : dealStart;
      const months = generateMonthRange(rangeStart, dealEnd);
      const prorateBase = (deal.prorateBase as ProrateBaseType) ?? "fixed30";

      let clientTotal = 0;
      for (const m of months) {
        const [y, mo] = m.split("-").map(Number);
        const prorate = calculateProrate({
          monthlyAmount: deal.monthlyAmount,
          year: y,
          month: mo,
          contractStartDate: dealStart,
          contractEndDate: dealEnd,
          prorateBase,
        });

        if (deal.status === "closed") {
          actualByMonth[m] = (actualByMonth[m] ?? 0) + prorate.amount;
          clientTotal += prorate.amount;
        } else if (deal.status === "active" || deal.status === "renewal") {
          if (m < currentMonth) {
            actualByMonth[m] = (actualByMonth[m] ?? 0) + prorate.amount;
            clientTotal += prorate.amount;
          } else {
            contractedByMonth[m] = (contractedByMonth[m] ?? 0) + prorate.amount;
          }
        } else {
          prospectByMonth[m] = (prospectByMonth[m] ?? 0) + prorate.amount;
        }
      }

      if (clientTotal > 0) {
        revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + clientTotal;
      }
    } else {
      // 月額契約: 既存ロジック
      if (!deal.monthlyAmount) continue;

      const dealStart = deal.contractStartDate ?? now;
      const dealEnd = deal.contractEndDate ?? new Date(now.getFullYear(), now.getMonth() + 12, 0);
      const rangeStart = startDate && startDate > dealStart ? startDate : dealStart;
      const months = generateMonthRange(rangeStart, dealEnd);

      for (const m of months) {
        if (deal.status === "closed") {
          actualByMonth[m] = (actualByMonth[m] ?? 0) + deal.monthlyAmount;
        } else if (deal.status === "active" || deal.status === "renewal") {
          if (m < currentMonth) {
            actualByMonth[m] = (actualByMonth[m] ?? 0) + deal.monthlyAmount;
          } else {
            contractedByMonth[m] = (contractedByMonth[m] ?? 0) + deal.monthlyAmount;
          }
        } else {
          prospectByMonth[m] = (prospectByMonth[m] ?? 0) + deal.monthlyAmount;
        }
      }

      // Client revenue: total from actual months (closed + active past)
      const totalMonths = months.length;
      if (deal.status === "closed") {
        revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.monthlyAmount * totalMonths;
      } else if (deal.status === "active" || deal.status === "renewal") {
        const pastMonths = months.filter((m) => m < currentMonth).length;
        if (pastMonths > 0) {
          revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.monthlyAmount * pastMonths;
        }
      }
    }
  }

  // Override with paid invoice amounts where available (more accurate)
  const invoiceWhere: Record<string, unknown> = { status: "paid" };
  if (startDate) {
    invoiceWhere.dueDate = { gte: startDate };
  }
  const paidInvoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: { year: true, month: true, amount: true, deal: { select: { client: { select: { name: true } } } } },
  });
  for (const inv of paidInvoices) {
    const key = `${inv.year}-${String(inv.month).padStart(2, "0")}`;
    // Paid invoices supplement the actual amount (don't double-count — but if invoice exists, it's the authoritative source)
    // For simplicity, add invoice amounts on top since they may differ from monthlyAmount
    if (!actualByMonth[key]) {
      actualByMonth[key] = inv.amount;
    }
  }

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

  const pipelineMap: Record<string, { count: number; amount: number }> = {};
  for (const deal of allDeals) {
    if (!pipelineMap[deal.status]) {
      pipelineMap[deal.status] = { count: 0, amount: 0 };
    }
    pipelineMap[deal.status].count += 1;
    const dealAmount = deal.billingType === "lumpsum"
      ? (deal.contractAmount ?? 0)
      : (deal.monthlyAmount ?? 0);
    pipelineMap[deal.status].amount += dealAmount;
  }

  const pipeline = Object.entries(pipelineMap).map(([status, data]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count: data.count,
    amount: data.amount,
  }));

  // --- Revenue by Status (for stacked breakdown) ---
  const revenueByStatus: Record<string, number> = {};
  for (const deal of deals) {
    let amount = 0;
    if (deal.billingType === "lumpsum") {
      amount = deal.contractAmount ?? 0;
    } else {
      amount = deal.monthlyAmount ?? 0;
    }
    if (amount > 0) {
      const statusLabel = STATUS_LABELS[deal.status] ?? deal.status;
      revenueByStatus[statusLabel] = (revenueByStatus[statusLabel] ?? 0) + amount;
    }
  }
  const statusRevenue = Object.entries(revenueByStatus)
    .map(([status, amount]) => ({ status, amount }))
    .sort((a, b) => b.amount - a.amount);

  // --- Available Fiscal Years ---
  const oldestDeal = await prisma.deal.findFirst({
    where: { contractStartDate: { not: null } },
    orderBy: { contractStartDate: "asc" },
    select: { contractStartDate: true },
  });
  const firstYear = oldestDeal?.contractStartDate
    ? (oldestDeal.contractStartDate.getMonth() < FISCAL_YEAR_START_MONTH - 1
        ? oldestDeal.contractStartDate.getFullYear() - 1
        : oldestDeal.contractStartDate.getFullYear())
    : currentFiscalYear;
  const fiscalYears: number[] = [];
  for (let y = firstYear; y <= currentFiscalYear; y++) {
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
  });
}
